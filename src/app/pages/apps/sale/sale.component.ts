import {
  Component,
  OnInit,
  TemplateRef,
  ViewChild,
  ElementRef,
  HostListener,
  Input,
} from '@angular/core'
import * as moment from 'moment'
import { FormControl, Validators } from '@angular/forms'
import { NzModalService } from 'ng-zorro-antd/modal'
import { NgbModal, ModalDismissReasons, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap'
import { AuthService } from 'src/app/auth.service'
import { NzNotificationService } from 'ng-zorro-antd'
import { Observable } from 'rxjs'
import { debounceTime, map } from 'rxjs/operators'
import { OrderItemModule, OrderModule, AdditionalCharge, Transaction } from './sale.module'
import { SyncService } from 'src/app/services/sync/sync.service'
import { PrintService } from 'src/app/services/print/print.service'

@Component({
  selector: 'app-sale',
  templateUrl: './sale.component.html',
  styleUrls: ['./sale.component.scss'],
  providers: [NgbModalConfig, NgbModal],
})
export class SaleComponent implements OnInit {
  @ViewChild('quantityel', { static: false }) public quantityel: TemplateRef<any> //productinput
  @ViewChild('discper', { static: false }) public discperel: TemplateRef<any>
  @ViewChild('disc', { static: false }) public discel: TemplateRef<any>
  @ViewChild('productautocomplete', { static: false }) public productinput: TemplateRef<any>
  @ViewChild('scrollframe', { static: false }) scrollFrame: ElementRef
  // @ViewChild('cardnumber', { static: false }) cardnumber: ElementRef;
  buffer = ''
  model: any = 'QWERTY'
  order: OrderModule
  paymenttypeid = 1
  isuppercase: boolean = false
  OrderNo = 0
  StoreId = 26
  companyId = 1
  loginfo: any
  isDisable = false
  charges = []
  deliverydate
  deliverytime
  // preorders: any = []
  // ordercount = {
  //   '2': { '-5': 0, '5': 0, '-1': 0, '-2': 0 },
  //   '3': { '-5': 0, '5': 0, '-1': 0, '-2': 0 },
  //   '4': { '-5': 0, '5': 0, '-1': 0, '-2': 0 },
  // }
  transactionlist: Array<Transaction> = null
  issplitpayment: boolean = false
  orderstatus = {
    '-1': { name: 'Cancelled' },
    '0': { name: 'Placed' },
    '1': { name: 'Accepted' },
    '2': { name: 'Preparing' },
    '3': { name: 'Food Ready' },
    '4': { name: 'Dispatched' },
    '5': { name: 'Delivered' },
  }
  name: any
  phoneNo: any
  city: any
  address: any
  InvoiceNo: any
  OrderedDateTime: any
  preferences = { ShowTaxonBill: true }
  AdditionalCharges: any
  CGST: number = 0
  SGST: number = 0
  IGST: number = 0
  Total: any
  PaidAmount: any
  Discount: number

  @HostListener('window:keyup', ['$event'])
  keyEvent(event: KeyboardEvent) {
    let data = this.buffer || ''
    if (event.key !== 'Enter' && event.key !== 'Shift') {
      // barcode ends with enter -key
      if (this.isuppercase) {
        data += event.key.toUpperCase()
        this.isuppercase = false
      } else {
        data += event.key
      }
      this.buffer = data
    } else if (event.key === 'Shift') {
      this.isuppercase = true
    } else {
      this.buffer = ''
      this.setproductbybarcode(data)
    }
    console.log(this.isuppercase)
  }
  scrollContainer: any
  products: any
  groupedProducts = []
  filteredvalues = []
  paymentTypes: any = []
  inputValue: string = ''
  barcValue: string = ''
  cartitems = []
  subtotal = 0
  searchTerm = ''
  tax = 0
  public show: boolean = false

  isVisible = false
  tableData = [
    {
      key: '1',
      actionName: 'New Users',
      progress: { value: 60, color: 'bg-success' },
      value: '+3,125',
    },
    {
      key: '2',
      actionName: 'New Reports',
      progress: { value: 15, color: 'bg-orange' },
      value: '+643',
    },
    {
      key: '3',
      actionName: 'Quote Submits',
      progress: { value: 25, color: 'bg-primary' },
      value: '+982',
    },
  ]
  // temporaryItem = { Id: 0, quantity: null, tax: 0, amount: 0, price: 0, Tax1: 0, Tax2: 0, barcodeId: 0 };
  temporaryItem: any = { DiscAmount: 0, Quantity: null, DiscPercent: 0 }
  barcodeItem = { quantity: null, tax: 0, amount: 0, price: 0, Tax1: 0, Tax2: 0 }
  barcodemode: boolean = false
  customerdetails = {
    id: 0,
    name: '',
    phoneNo: '',
    email: '',
    address: '',
    companyId: 0,
    datastatus: '',
  }
  @Input() sectionid: number = 0
  customers: any = []
  // quantityfc = new FormControl('', [Validators.required, Validators.min(1)]);
  search = (text$: Observable<string>) =>
    text$.pipe(
      debounceTime(200),
      map(term =>
        term === ''
          ? []
          : this.groupedProducts
              .filter(
                v =>
                  (v.product.toLowerCase().indexOf(term.toLowerCase()) > -1 ||
                    v.barCode?.toLowerCase().indexOf(term.toLowerCase()) > -1) &&
                  v.quantity > 0,
              )
              .slice(0, 10),
      ),
    )

  formatter = (x: { product: string }) => x.product
  user: any
  constructor(
    private modalService: NgbModal,
    private Auth: AuthService,
    private notification: NzNotificationService,
    private sync: SyncService,
    config: NgbModalConfig,
    private printservice: PrintService,
  ) {
    config.backdrop = 'static'
    config.keyboard = false
    this.user = JSON.parse(localStorage.getItem('user'))
  }
  // getErrorMessage() {
  //   if (this.quantityfc.hasError('required')) {
  //     return "Quantity can't be Empty";
  //   }

  //   return this.quantityfc.hasError('min') ? 'Quantity should be greater than 0' : '';
  // }

  orderkey = { orderno: 1, timestamp: 0, GSTno: '' }

  ngOnInit(): void {
    this.orderkey = localStorage.getItem('orderkey')
      ? JSON.parse(localStorage.getItem('orderkey'))
      : { orderno: 1, timestamp: 0, GSTno: '' }
    this.Auth.getloginfo().subscribe(data => {
      this.loginfo = data
      this.order = new OrderModule(6)
      this.sync.sync()
      this.products = []
      this.getproducts()
      this.getcustomers()
      this.GetStorePaymentType()
      // this.updateorderno()
      this.temporaryItem.Quantity = null
      // this.products = JSON.parse(localStorage.getItem("Product"));
      this.products.forEach(product => {
        product.Quantity = null
        product.tax = 0
        product.amount = 0
      })
      this.customerdetails = {
        id: 0,
        name: '',
        phoneNo: '',
        email: '',
        address: '',
        companyId: this.companyId,
        datastatus: '',
      }
    })
  }

  updateorderno() {
    this.orderkey.orderno++
    localStorage.setItem('orderkey', JSON.stringify(this.orderkey))
    // this.Auth.updateorderkey(this.orderkey).subscribe(data => { })
    console.log(this.orderkey)
  }

  getproducts() {
    this.Auth.getproducts().subscribe(data => {
      this.products = data
      console.log(this.products)
      this.products.forEach(prod => {
        prod.maxqty = prod.quantity
      })
      this.groupProduct()
    })
  }

  orderlogging(eventname) {
    var logdata = {
      event: eventname,
      orderjson: JSON.stringify(this.order),
      ordertypeid: this.order.OrderTypeId,
      orderno: this.orderkey.orderno,
      timestamp: new Date().getTime(),
    }
    this.Auth.logorderevent(logdata).subscribe(data => {})
  }

  createorder(ordertypeid) {
    this.order = new OrderModule(ordertypeid)
    this.order.createdtimestamp = new Date().getTime()
    this.charges.forEach(charge => {
      this.order.additionalchargearray.push(new AdditionalCharge(charge))
    })
    if (![2, 3, 4].includes(this.order.OrderTypeId)) {
      this.order.additionalchargearray.forEach(charge => {
        charge.selected = false
      })
    }
    this.order.StoreId = this.loginfo.StoreId
    // this.order.DeliveryStoreId = this.loginfo.StoreId
    this.orderlogging('create_order')
    this.show = false
    this.sectionid = 2
    if (this.order.IsAdvanceOrder || this.order.OrderTypeId == 2) {
      this.deliverydate = moment().format('YYYY-MM-DD')
      this.deliverytime = moment().format('HH:MM')
    }
  }

  groupProduct() {
    // var res = this.products.reduce((groups, currentValue) => {
    //   if (groups.indexOf(currentValue.barcodeId) === -1) {
    //     groups.push(currentValue.barcodeId);
    //   }
    //   return groups;
    // }, []).map((barcodeId,createdDate,isInclusive,maxqty,product,productId,quantity,stockBatchId,tax1,tax2,tax3,barCode) => {
    //   return {
    //     barcodeId: barcodeId,
    //     createdDate:createdDate,
    //     isInclusive:isInclusive,
    //     maxqty:maxqty,
    //     product:product,
    //     productId:productId,
    //     quantity:quantity,
    //     stockBatchId:stockBatchId,
    //     tax1:tax1,
    //     tax2:tax2,
    //     tax3:tax3,
    //     barCode:barCode,
    //     price: this.products.filter((_el) => {
    //       return _el.barcodeId === barcodeId;
    //     }).map((_el) => { return _el.price; })
    //   }
    // });
    // console.log(res)
    var helper = {}
    this.groupedProducts = this.products.reduce((r, o) => {
      var key = o.barcodeId + '-'

      if (!helper[key]) {
        helper[key] = Object.assign({}, o) // create a copy of o
        r.push(helper[key])
      }

      return r
    }, [])

    console.log(this.groupedProducts)
  }
  setproductbybarcode(code) {
    // console.log(code, this.products.filter(x => x.Product == code));
    // var product = this.products.filter(x => x.Product == code)[0];
    // if (product) {
    //   this.temporaryItem = product;
    //   this.temporaryItem.Quantity = 1;
    //   // this.temporaryItem.amount = this.temporaryItem.price * this.temporaryItem.Quantity
    //   // this.temporaryItem.tax = (this.temporaryItem.Tax1 + this.temporaryItem.Tax2) * this.temporaryItem.amount / 100
    //   // this.temporaryItem.amount = +this.temporaryItem.amount.toFixed(2)
    //   // this.temporaryItem.totalprice = +(this.temporaryItem.price * this.temporaryItem.quantity).toFixed(2)
    //   if (this.order.Items.some(x => x.Id == this.temporaryItem["Id"])) {
    //     this.order.Items.filter(x => x.Id == this.temporaryItem["Id"])[0].OrderQuantity += this.temporaryItem.Quantity
    //   } else {
    //     this.order.Items.push(Object.assign({}, this.temporaryItem));
    //   }
    //   this.calculate();
    //  this.temporaryItem = { DiscAmount: 0, Quantity: null, DiscPercent: 0 };
    //   8901803000179
    // }
  }

  getcustomers() {
    this.Auth.getcustomers().subscribe(data => {
      this.customers = data
      console.log(data)
      // for(var key in this.order.CustomerDetails) {
      //   this.order.CustomerDetails[key] = this.customers[key.toLowerCase()]
      // // }
      // console.log(this.order.CustomerDetails)
    })
  }
  savedata() {
    // if (this.order.CustomerDetails.datastatus == 'new') {
    this.addcustomer()
    // } else if (this.order.CustomerDetails.datastatus == 'old') {
    //   this.updatecustomer();
    // }
  }
  updatecustomer() {
    Object.keys(this.order.CustomerDetails).forEach(key => {
      this.customerdetails[key.charAt(0).toLowerCase() + key.slice(1)] = this.order.CustomerDetails[
        key
      ]
    })

    this.Auth.updateCustomerdb(this.customerdetails).subscribe(
      data => {
        // console.log(data);
        this.notification.success(
          'Customer Updated!',
          `${this.order.CustomerDetails.Name} updated successfully.`,
        )
      },
      error => {
        // console.log(error)
      },
      () => {
        this.getcustomers()
      },
    )
  }

  // Create New Customer
  addcustomer() {
    Object.keys(this.order.CustomerDetails).forEach(key => {
      this.customerdetails[key.charAt(0).toLowerCase() + key.slice(1)] = this.order.CustomerDetails[
        key
      ]
    })
    this.Auth.addCustomerdb(this.customerdetails).subscribe(
      data => {
        // console.log(data);
        this.notification.success(
          'Customer Added!',
          `${this.order.CustomerDetails.Name} added successfully.`,
        )
        this.order.CustomerDetails.datastatus = 'old'
      },
      error => {
        // console.log(error)
      },
      () => {
        this.getcustomers()
      },
    )
  }

  // Get Customers
  private async getCustomer() {
    // Sleep thread for 3 seconds
    // console.log(this.order.CustomerDetails.phoneNo)
    // console.log(this.customers)
    this.order.CustomerDetails.datastatus = 'loading'
    // await this.delay(3000);
    // console.log(this.customers)
    if (this.customers.some(x => x.phoneNo == this.order.CustomerDetails.PhoneNo)) {
      var obj = this.customers.filter(x => x.phoneNo == this.order.CustomerDetails.PhoneNo)[0]
      console.log(obj)
      this.order.CustomerId = obj.id
      // Object.keys(obj).forEach(element => {
      //   this.order.CustomerDetails[element] = obj[element]
      // });
      Object.keys(this.order.CustomerDetails).forEach(key => {
        this.order.CustomerDetails[key] = obj[key.charAt(0).toLowerCase() + key.slice(1)]
      })
      // if (!this.order.CustomerDetails.Id) this.order.CustomerDetails.Id == 0
      console.log(this.order.CustomerDetails)
      this.order.CustomerDetails.datastatus = 'old'
    } else {
      this.order.CustomerDetails.datastatus = 'new'
    }
  }
  private delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
  scrollToBottom(): void {
    var el = document.getElementsByClassName('ant-table-body')[0]
    // console.log(el.scrollHeight)
    // this.scrollContainer = this.scrollFrame.nativeElement;
    // console.log(this.scrollContainer, this.scrollFrame)
    el.scroll({
      top: el.scrollHeight + 1000,
      left: 0,
      behavior: 'smooth',
    })
  }

  filterAutoComplete() {
    this.filteredvalues = this.products.filter(x =>
      x.product.toLowerCase().includes(this.inputValue),
    )
  }
  fieldselect(event) {
    // console.log(event)
    // console.log(event.element.nativeElement.id)
    var product = this.products.filter(x => x.barcodeId == +event.element.nativeElement.id)[0]
    this.inputValue = product.product
    // document.getElementById("productautocomplete").nodeValue = product.Product;
    this.temporaryItem = product
  }
  // addItem() {
  //   this.temporaryItem.amount = this.temporaryItem.price * this.temporaryItem.quantity
  //   this.temporaryItem.tax = (this.temporaryItem.Tax1 + this.temporaryItem.Tax2) * this.temporaryItem.amount / 100
  //   this.temporaryItem.amount = +this.temporaryItem.amount.toFixed(2)
  //   // this.temporaryItem.totalprice = +(this.temporaryItem.price * this.temporaryItem.quantity).toFixed(2)
  //   if (this.cartitems.some(x => x.barcodeId == this.temporaryItem["barcodeId"])) {
  //     this.cartitems.filter(x => x.barcodeId == this.temporaryItem["barcodeId"])[0].quantity += this.temporaryItem.quantity
  //   } else {
  //     this.cartitems.push(Object.assign({}, this.temporaryItem));
  //   }
  //   this.calculate();
  //   this.inputValue = '';
  //   this.temporaryItem.quantity = null;
  //   this.temporaryItem = { Id: 0, quantity: null, tax: 0, amount: 0, price: 0, Tax1: 0, Tax2: 0,barcodeId: 0 };
  //   console.log(this.productinput)
  //   this.productinput['nativeElement'].focus()
  //   this.filteredvalues = [];
  //   this.scrollToBottom();
  // }
  submitted: boolean = false
  addItem() {
    this.submitted = true
    if (this.validation()) {
      if (this.order.Items.some(x => x.stockBatchId == this.temporaryItem['stockBatchId'])) {
        this.order.Items.filter(
          x => x.stockBatchId == this.temporaryItem['stockBatchId'],
        )[0].OrderQuantity += this.temporaryItem.Quantity
        this.order.setbillamount()
      } else {
        this.order.addproduct(this.temporaryItem)
      }
      this.products.forEach(prod => {
        if (prod.stockBatchId == this.temporaryItem['stockBatchId']) {
          prod.quantity -= this.temporaryItem.Quantity
        }
      })
      this.temporaryItem = { DiscAmount: 0, Quantity: null, DiscPercent: 0 }
      this.productinput['nativeElement'].focus()
      this.model = ''
      this.filteredvalues = []
      this.submitted = false
      // this.isDisable = true;
      // console.log(this.order)

      return
      // this.cartitems.push(Object.assign({}, this.temporaryItem));
      // console.log(this.cartitems)
      // this.calculate();
      // this.temporaryItem.quantity = null;
      // this.temporaryItem.price = null;
      // this.temporaryItem.disc = null;
      // this.temporaryItem = { Id: 0, quantity: null, taxpercent: null, tax: 0, amount: 0, price: null, Tax1: 0, Tax2: 0, barcode_Id: 0, disc: 0, product: "", };
      // console.log(this.productinput)
      // this.productinput['nativeElement'].focus()
      // this.model = "";
      // this.filteredvalues = [];
      // this.submitted = false;
    }
  }

  getcustomerdetails(compid) {
    this.Auth.getcustomers().subscribe(data => {
      console.log(compid)
    })
  }
  barcodereaded(event) {
    // console.log(event)
    // console.log(event.element.nativeElement.id)
    var product = this.products.filter(x => x.Id == +event.element.nativeElement.id)[0]
    this.inputValue = product.Product
    this.barcodeItem = product
    this.barcodeItem.quantity = 1
    if (this.cartitems.some(x => x.Id == this.barcodeItem['Id'])) {
      this.cartitems.filter(
        x => x.Id == this.barcodeItem['Id'],
      )[0].quantity += this.barcodeItem.quantity
    } else {
      this.cartitems.push(Object.assign({}, this.barcodeItem))
    }
    this.calculate()
    this.barcodeItem = { quantity: null, tax: 0, amount: 0, price: 0, Tax1: 0, Tax2: 0 }
    this.barcValue = ''
  }
  quantitychange(item: OrderItemModule, event) {
    var prod = this.products.filter(x => x.stockBatchId == item.stockBatchId)[0]
    console.log(item.OrderQuantity, prod.maxqty)
    if (item.OrderQuantity && item.OrderQuantity <= prod.maxqty) {
      console.log('%c GOOD! ', 'color: #bada55')
      this.products.filter(x => x.stockBatchId == item.stockBatchId)[0].quantity =
        prod.maxqty - item.OrderQuantity
      this.order.setbillamount()
    } else if (item.OrderQuantity == 0 || item.OrderQuantity == null) {
      event.preventDefault()
      console.log('%c VERY LOW! ', 'color: orange')
      item.OrderQuantity = 1
      this.products.filter(x => x.stockBatchId == item.stockBatchId)[0].quantity = prod.maxqty - 1
      this.order.setbillamount()
    } else {
      event.preventDefault()
      console.log('%c EXCEED! ', 'color: red')
      item.OrderQuantity = 1
      this.products.filter(x => x.stockBatchId == item.stockBatchId)[0].quantity = prod.maxqty - 1
      this.order.setbillamount()
    }
    console.log(item.OrderQuantity)
  }
  delete(index) {
    this.products.forEach(prod => {
      if (prod.stockBatchId == this.order.Items[index].stockBatchId) {
        prod.quantity += this.order.Items[index].OrderQuantity
      }
    })
    this.order.Items.splice(index, 1)
    this.order.setbillamount()
  }
  clearallorders() {
    this.order = new OrderModule(6)
  }
  settotalprice(i, qty) {
    this.cartitems[i].amount = this.cartitems[i].price * this.cartitems[i].quantity
    this.cartitems[i].tax =
      (this.cartitems[i].amount * (this.cartitems[i].Tax1 + this.cartitems[i].Tax2)) / 100
    // console.log(i, this.cartitems[i].price, this.cartitems[i].quantity, this.cartitems[i].amount, qty)
    this.cartitems[i].amount = +this.cartitems[i].amount.toFixed(2)
    this.calculate()
  }
  calculate() {
    this.subtotal = 0
    this.tax = 0
    this.cartitems.forEach(item => {
      // console.log(item)
      item.amount = item.price * item.quantity
      item.tax = ((item.Tax1 + item.Tax2) * item.amount) / 100
      item.amount = +item.amount.toFixed(2)
      this.subtotal += item.amount
      this.tax += item.tax
    })
    this.subtotal = +this.subtotal.toFixed(2)
    this.tax = +this.tax.toFixed(2)
    // console.log(this.tax)
  }
  date = new Date()
  onChange(e) {
    console.log(e, moment(e), this.date)
  }
  showModal(): void {
    this.isVisible = true
  }

  handleOk(): void {
    // console.log('Button ok clicked!')
    this.isVisible = false
  }

  handleCancel(): void {
    // console.log('Button cancel clicked!')
    this.isVisible = false
  }
  openCustomClass(content) {
    this.modalService.open(content, { centered: true })
  }
  opensplit(content) {
    this.modalService.open(content, { centered: true })
  }
  ////////////////////////////////////////dfgdfhsfhgj?//////////////////////////////////
  batchproduct: any = []
  selectedItem(batchproduct, barcodeId) {
    this.batchproduct = this.products.filter(x => x.barcodeId == barcodeId)
    if (this.batchproduct.length > 1) {
      this.modalService.open(batchproduct, { centered: true })
    } else {
      this.selectedproduct(this.batchproduct[0])
    }
    this.quantityel['nativeElement'].focus()
  }
  selectedproduct(product) {
    console.log(product)
    Object.keys(product).forEach(key => {
      this.temporaryItem[key] = product[key]
    })
    this.modalService.dismissAll()
    // this.quantityel['nativeElement'].focus()
  }
  validation() {
    var isvalid = true
    // if (!this.temporaryItem.productId) isvalid = false;
    if (this.temporaryItem.Quantity <= 0) isvalid = false
    if (this.temporaryItem.Quantity > this.temporaryItem.quantity) isvalid = false
    return isvalid
  }

  orderkeyValidation() {
    var todate = new Date().getDate()
    var orderkeydate = new Date(this.orderkey.timestamp).getDate()
    var ls_orderkey = JSON.parse(localStorage.getItem('orderkey'))
    if (ls_orderkey) var ls_orderkeydate = new Date(ls_orderkey.timestamp).getDate()
    var orderkey_obj: any = {}
    if (ls_orderkey && ls_orderkey.timestamp > this.orderkey.timestamp) {
      orderkey_obj = ls_orderkey
    } else {
      orderkey_obj = this.orderkey
    }
    if (new Date(orderkey_obj.timestamp).getDate() != todate) {
      orderkey_obj.kotno = 1
      orderkey_obj.orderno = 1
    }
    orderkey_obj.timestamp = new Date().getTime()
    this.orderkey = orderkey_obj
    localStorage.setItem('orderkey', JSON.stringify(this.orderkey))
    this.Auth.updateorderkey(this.orderkey).subscribe(d => {})
  }

  temporder: OrderModule = null
  transaction: Transaction
  currentitem: OrderItemModule = null

  // splitpayment() {
  //   this.transactionlist = []
  //   this.issplitpayment = true
  //   this.paymentTypes.forEach(pt => {
  //     var transaction = new Transaction()
  //     transaction = new Transaction()
  //     transaction.Remaining = this.temporder.BillAmount - this.temporder.PaidAmount
  //     transaction.Amount = 0
  //     transaction.OrderId = this.temporder.OrderId
  //     transaction.StoreId = this.loginfo.StoreId
  //     transaction.TransDate = moment().format('YYYY-MM-DD')
  //     transaction.TransDateTime = moment().format('YYYY-MM-DD HH:mm')
  //     transaction.TranstypeId = 1
  //     transaction.UserId = this.temporder.UserId
  //     transaction.CompanyId = this.temporder.CompanyId
  //     transaction.CustomerId = this.temporder.CustomerDetails.Id
  //     transaction.StorePaymentTypeName = pt.Description
  //     transaction.StorePaymentTypeId = pt.Id
  //     this.transactionlist.push(transaction)
  //   })
  // }

  // saveOrder
  saveOrder() {
    this.order.OrderNo = this.orderkey.orderno
    this.updateorderno()
    this.electronPrint()
    this.order.OrderNo = this.orderkey.orderno
    this.order.BillDate = moment().format('YYYY-MM-DD HH:MM A')
    this.order.CreatedDate = moment().format('YYYY-MM-DD HH:MM A')
    this.order.BillDateTime = moment().format('YYYY-MM-DD HH:MM A')
    this.order.OrderedDate = moment().format('YYYY-MM-DD HH:MM A')
    this.order.OrderedDateTime = moment().format('YYYY-MM-DD HH:MM A')
    this.order.DeliveryDateTime = moment().format('YYYY-MM-DD HH:MM A')
    this.order.ModifiedDate = moment().format('YYYY-MM-DD HH:MM A')
    this.order.InvoiceNo = this.StoreId + moment().format('YYYYMMDD') + '/' + this.order.OrderNo
    this.order.CompanyId = this.companyId

    this.order.StoreId = this.StoreId
    this.order.CustomerDetails.CompanyId = this.companyId
    this.order.CustomerDetails.StoreId = this.StoreId
    this.order.OrderedById = 18
    this.order.ProdStatus = '1'
    this.order.WipStatus = '1'
    this.order.SuppliedById = 12
    this.order.UserId = this.user.id
    if (this.order.PaidAmount > 0) {
      if (this.order.StorePaymentTypeId != -1) {
        var transaction = new Transaction(this.order.PaidAmount, this.order.StorePaymentTypeId)
        transaction.OrderId = this.order.OrderId
        transaction.CustomerId = this.order.CustomerDetails.Id
        transaction.TranstypeId = 1
        transaction.PaymentStatusId = 0
        transaction.TransDateTime = moment().format('YYYY-MM-DD HH:mm:ss')
        transaction.TransDate = moment().format('YYYY-MM-DD')
        transaction.UserId = this.order.UserId
        transaction.CompanyId = this.companyId
        transaction.StoreId = this.StoreId
        transaction.Notes = null
        transaction.InvoiceNo = this.order.InvoiceNo
        transaction.saved = true
        this.transaction = transaction
        this.order.Transactions.push(this.transaction)
      } else if (this.order.StorePaymentTypeId == -1) {
        this.transactionlist = this.transactionlist.filter(x => x.Amount > 0)
        this.transactionlist.forEach(trxn => {
          trxn.InvoiceNo = this.order.InvoiceNo
          trxn.CompanyId = this.order.CompanyId
          trxn.StoreId = this.loginfo.StoreId
          trxn.saved = true
          this.order.Transactions.push(trxn)
        })
      }
    }
    console.log(this.order.CustomerDetails)
    localStorage.setItem('lastorder', JSON.stringify(this.order))
    this.Auth.saveordertonedb(this.order).subscribe(data => {
      console.log(data)
      this.sync.sync()
      this.order = new OrderModule(6)
    })
    this.addcustomer()
    this.notification.success('Ordered Saved successfully!', `Ordered Saved successfully.`)
  }
  crossclick() {
    this.temporaryItem = { DiscAmount: 0, Quantity: null, DiscPercent: 0 }
    this.productinput['nativeElement'].focus()
    this.model = ''
    this.filteredvalues = []
    this.submitted = false
  }

  getcustomer() {
    this.Auth.getCustomerByPhone(this.order.CustomerDetails.PhoneNo).subscribe(data => {
      var customer: any = data[0]
      if (customer) {
        for (var key in this.order.CustomerDetails) this.order.CustomerDetails[key] = customer[key]
        this.savedata()
      }
    })
  }

  storePaymentTypes: any = []
  GetStorePaymentType() {
    this.Auth.getstorepaymentType(0).subscribe(data => {
      console.log(data)
      this.storePaymentTypes = data
    })
  }

  // print order

  printersettings = { receiptprinter: '' }
  printhtmlstyle = `
  <style>
    #printelement {
      width: 270px;
    }
    .header {
        text-align: center;
    }
    .item-table {
        width: 100%;
    }
    .text-right {
      text-align: right!important;
    }
    .text-left {
      text-align: left!important;
    }
    .text-center {
      text-align: center!important;
    }
    tr.nb, thead.nb {
        border-top: 0px;
        border-bottom: 0px;
    }
    table, p, h3 {
      empty-cells: inherit;
      font-family: Helvetica;
      font-size: small;
      width: 290px;
      padding-left: 0px;
      border-collapse: collapse;
    }
    table, tr, td {
      border-bottom: 0;
    }
    hr {
      border-top: 1px dashed black;
    }
    tr.bt {
      border-top: 1px dashed black;
      border-bottom: 0px;
    }
    tr {
      padding-top: -5px;
    }
  </style>`

  print(): void {
    let printContents, popupWin
    printContents = document.getElementById('demo').innerHTML
    popupWin = window.open('', '_blank', 'top=0,left=0,height=100%,width=auto')
    popupWin.document.open()
    popupWin.document.write(`
    <html>
      <head>
        <title>Print tab</title>
        <style>
        @media print {
          app-root > * { display: none; }
          app-root app-print-layout { display: block; }
          .header{
            text-align: center;
          }
          th{
            text-align: left 
        }
          body   { font-family: 'Courier New', Courier, monospace; width: 300px }
          br {
            display: block; /* makes it have a width */
            content: ""; /* clears default height */
            margin-top: 0; /* change this to whatever height you want it */
          }
          hr.print{
            display: block;
            height: 1px;
            background: transparent;
            width: 100%;
            border: none;
            border-top: dashed 1px #aaa;
        } 
        tr.print
          {
            border-bottom: 1px solid #000;;
          }
        }
        </style>
      </head>
  <body onload="window.print();window.close()">${printContents}</body>
    </html>`)
    popupWin.document.close()
  }
  electronPrint() {
    console.log(this.order, this.Discount)
    var element = `<div class="header">
    <p style="text-align: center;font-family: Helvetica;font-size: medium;"><strong>${
      this.name
    }</strong></p>
    <p style="text-align: center;font-family: Helvetica;font-size: small;">
    ${this.address}, ${this.city},  ${this.phoneNo}<br>
    GSTIN:${localStorage.getItem('GSTno')}<br>
    Receipt: ${this.InvoiceNo}<br>
    ${this.OrderedDateTime}</p>
    <hr>
    </div>
    <table>
        <thead>
            <tr>
                <th style="width: 100px;"><strong>ITEM</strong></th>
                <th><strong>PRICE</strong></th>
                <th><strong>QTY</strong></th>
                <th style="text-align: right;padding-right:20px"><strong>AMOUNT</strong></th>
            </tr>
        </thead>
        <tbody>`
    var Subtotal = 0
    var disc_tax = 0
    this.order.Items.forEach(Items => {
      element =
        element +
        `<tr>
      <td style="width: 100px;">${Items.ProductName}</td>
      <td>${Items.Price}</td>
      <td>${Items.OrderQuantity}${Items.ComplementryQty > 0 ? '+' + Items.ComplementryQty : ''}</td>
      <td style="text-align: right;padding-right:20px">${
        this.preferences.ShowTaxonBill
          ? (Items.Price * Items.OrderQuantity).toFixed(2)
          : (
              Items.Price *
              Items.OrderQuantity *
              (1 + (Items.Tax1 + Items.Tax2 + Items.Tax3) / 100)
            ).toFixed(2)
      }</td>
      </tr>`
      if (!this.preferences.ShowTaxonBill) {
        Subtotal =
          Subtotal +
          Items.Price * Items.OrderQuantity * (1 + (Items.Tax1 + Items.Tax2 + Items.Tax3) / 100)
        disc_tax = disc_tax + (this.Discount * (Items.Tax1 + Items.Tax2 + Items.Tax3)) / 100
      }
    })
    element =
      element +
      `
    </tbody>
    </table>
    <hr>
    <table>
        <tbody>
            <tr>
                <td style="width: 100px;"><strong>Subtotal</strong></td>
                <td></td>
                <td></td>
                <td style="text-align: right;padding-right:20px">${
                  this.preferences.ShowTaxonBill
                    ? this.order.Subtotal.toFixed(2)
                    : Subtotal.toFixed(2)
                }</td>
            </tr>`
    // this.AdditionalCharges.forEach(item => {
    //   element =
    //     element +
    //     `<tr">
    //                             <td style="width: 100px;"><strong>${item.Description}</strong></td>
    //                             <td></td>
    //                             <td></td>
    //                             <td style="text-align: right;padding-right:20px">${item.ChargeAmount.toFixed(
    //       2,
    //     )}</td>
    //                         </tr>`
    // })
    if (this.Discount > 0) {
      element =
        element +
        `<tr>
      <td style="width: 100px;"><strong>Discount</strong></td>
      <td></td>
      <td></td>
      <td style="text-align: right;padding-right:20px">${(this.Discount + disc_tax).toFixed(2)}</td>
      </tr>`
    }
    if (this.order.Tax1 > 0 && this.preferences.ShowTaxonBill) {
      element =
        element +
        `<tr>
      <td style="width: 100px;"><strong>CGST</strong></td>
      <td></td>
      <td></td>
      <td style="text-align: right;padding-right:20px">${this.order.Tax1.toFixed(2)}</td>
  </tr>`
    }
    if (this.order.Tax2 > 0 && this.preferences.ShowTaxonBill) {
      element =
        element +
        `<tr>
      <td style="width: 100px;"><strong>SGST</strong></td>
      <td></td>
      <td></td>
      <td style="text-align: right;padding-right:20px">${this.order.Tax2.toFixed(2)}</td>
  </tr>`
    }

    element =
      element +
      `
            <tr>
                <td style="width: 100px;">Paid</td>
                <td></td>
                <td></td>
                <td style="text-align: right;padding-right:20px"><strong>${(+this.order.PaidAmount.toFixed(
                  0,
                )).toFixed(2)}</strong></td>
            </tr>
            <tr>
                <td style="width: 100px;">Total</td>
                <td></td>
                <td></td>
                <td style="text-align: right;padding-right:20px"><strong>${(+this.order.BillAmount.toFixed(
                  0,
                )).toFixed(2)}</strong></td>
            </tr>
            <tr ${+(this.order.BillAmount - this.order.PaidAmount).toFixed(0) == 0 ? 'hidden' : ''}>
                <td style="width: 100px;">Balance</td>
                <td></td>
                <td></td>
                <td style="text-align: right;padding-right:20px"><strong>${(+(
                  this.order.BillAmount - this.order.PaidAmount
                ).toFixed(0)).toFixed(2)}</strong></td>
            </tr>
        </tbody>
    </table>
    <hr>
    <p style="text-align: center;font-family: Helvetica;">Thankyou. Visit again.</p>
</div>
<style>
  table{
    empty-cells: inherit;
    font-family: Helvetica;
    font-size: small;
    width: 290px;
    padding-left: 0px;
  }
  th{
    text-align: left 
  }
  hr{
    border-top: 1px dashed black
  }
  tr.bordered {
    border-top: 100px solid #000;
    border-top-color: black;
  }
</style>`
    this.printreceipt()
  }

  printreceipt() {
    var printtemplate = `
    <div id="printelement">
    <div class="header">
    <h3>${this.loginfo.name}</h3>
    <p>
        ${this.loginfo.store}, ${this.loginfo.address}<br>
        ${this.loginfo.city}, ${this.loginfo.phoneNo}
        GSTIN:${this.loginfo.GSTno}<br>
        Receipt: ${this.order.InvoiceNo}<br>
        ${this.order.OrderedDateTime}
        </p>
    </div>
    <hr>
    <div ${this.order.CustomerDetails.PhoneNo ? '' : 'hidden'} class="header">
        <h3 ${this.order.CustomerDetails.Name ? '' : 'hidden'}>${
      this.order.CustomerDetails.Name
    }</h3>
        <p>${
          this.order.CustomerDetails.Address ? this.order.CustomerDetails.Address + '<br>' : ''
        }${this.order.CustomerDetails.City ? this.order.CustomerDetails.City + ',' : ''}${
      this.order.CustomerDetails.PhoneNo
    }</p>
    </div>   
    <hr> 
    <table class="item-table">
        <thead class="nb">
            <th class="text-left" style="width: 100px;">ITEM</th>
            <th>PRICE</th>
            <th>QTY</th>
            <th class="text-right">AMOUNT</th>
        </thead>
        <tr>
         	<td colspan="4"><hr></td>
         </tr> 
        <tbody>`
    var extra = 0
    this.order.Items.forEach(item => {
      printtemplate += `
      <tr class="nb">
          <td class="text-left">${item.ProductName}</td>
          <td>${item.Price}</td>
          <td>${item.OrderQuantity}${
        item.ComplementryQty > 0 ? '(' + item.ComplementryQty + ')' : ''
      }</td>
          <td class="text-right">${item.OrderQuantity > 0 ? item.TotalAmount.toFixed(2) : 0}</td>
      </tr>`
      extra += item.Extra
    })
    printtemplate += `
    <tr class="bt">
        <td class="text-left"><strong>Sub Total</strong></td>
        <td colspan="2"></td>
        <td class="text-right">${this.order.Subtotal}</td>
    </tr>
    <tr class="nb" ${this.order.DiscAmount == 0 ? 'hidden' : ''}>
        <td class="text-left"><strong>Discount</strong></td>
        <td colspan="2"></td>
        <td class="text-right">${this.order.DiscAmount.toFixed(2)}</td>
    </tr>
    <tr class="nb" ${this.order.Tax1 == 0 ? 'hidden' : ''}>
        <td class="text-left"><strong>CGST</strong></td>
        <td colspan="2"></td>
        <td class="text-right">${this.order.Tax1.toFixed(2)}</td>
    </tr>
    <tr class="nb" ${this.order.Tax2 == 0 ? 'hidden' : ''}>
        <td class="text-left"><strong>SGST</strong></td>
        <td colspan="2"></td>
        <td class="text-right">${this.order.Tax2.toFixed(2)}</td>
    </tr>`
    // this.AdditionalCharges.forEach(charge => {
    //   printtemplate += `
    //       <tr class="nb">
    //           <td class="text-left"><strong>${charge.Description}</strong></td>
    //           <td colspan="2"></td>
    //           <td class="text-right">${charge.ChargeAmount.toFixed(2)}</td>
    //       </tr>`
    // })
    printtemplate += `
          <tr class="nb" ${extra > 0 ? '' : 'hidden'}>
              <td class="text-left"><strong>Extra</strong></td>
              <td colspan="2"></td>
              <td class="text-right">${(+extra.toFixed(0)).toFixed(2)}</td>
          </tr>
          <tr class="nb">
              <td class="text-left"><strong>Paid</strong></td>
              <td colspan="2"></td>
              <td class="text-right">${(+this.order.PaidAmount.toFixed(0)).toFixed(2)}</td>
          </tr>
          <tr class="nb">
              <td class="text-left"><strong>Total</strong></td>
              <td colspan="2"></td>
              <td class="text-right">${(+this.order.BillAmount.toFixed(0)).toFixed(2)}</td>
          </tr>
          <tr class="nb" ${this.order.BillAmount - this.order.PaidAmount > 0 ? '' : 'hidden'}>
              <td class="text-left"><strong>Balance</strong></td>
              <td colspan="2"></td>
              <td class="text-right">${(+(this.order.BillAmount - this.order.PaidAmount).toFixed(
                0,
              )).toFixed(2)}</td>
          </tr>
        </tbody>
      </table>
      <hr>
      <div class="text-center">
        <p>Powered By Biz1Book.</p>
      </div>
    </div>`

    printtemplate += this.printhtmlstyle
    console.log(printtemplate)
    if (this.printersettings)
      this.printservice.print(printtemplate, [this.printersettings.receiptprinter])
  }
}

import { Component, OnInit } from '@angular/core'
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap'
import { AuthService } from 'src/app/auth.service'
import { en_US, zh_CN, NzI18nService } from 'ng-zorro-antd/i18n'
import { getISOWeek } from 'date-fns'
import {
  NgbDate,
  NgbDateStruct,
  NgbCalendar,
  NgbDateParserFormatter,
} from '@ng-bootstrap/ng-bootstrap'
import * as moment from 'moment'
import {
  NzPlacementType,
  NzContextMenuService,
  NzDropdownMenuComponent,
} from 'ng-zorro-antd/dropdown'
import { OrderModule } from '../sale/sale.module'
import { PrintService } from 'src/app/services/print/print.service'
@Component({
  selector: 'app-receipt',
  templateUrl: './receipt.component.html',
  styleUrls: ['./receipt.component.scss'],
})
export class ReceiptComponent implements OnInit {
  dateRange = []
  Company: any
  ContactNo: any
  preferences = { ShowTaxonBill: true }
  customer: any
  filteredcustomer: any

  onChange(result: Date): void {
    console.log('onChange: ', result)
    this.strdate = moment(result[0]).format('YYYY-MM-DD')
    this.enddate = moment(result[1]).format('YYYY-MM-DD')
    this.getReceipt()
    this.gettrans()
  }
  getWeek(result: Date): void {
    console.log('week: ', getISOWeek(result))
  }
  model: NgbDateStruct
  date: { year: number; month: number }
  public buttonName: any = 'Back'
  value: string
  selectedValue = 'All'
  receipts: any
  show: number = 0
  orderitem: any
  term
  orderno: any
  Subtotal: number = 0
  Total: number = 0
  element: any
  orderid: any
  CompanyId: any
  StoreId: any
  UserId: number
  OrderStauts: number
  systemPrinters: any
  strdate: string
  enddate: string
  user: any
  id = 1
  trans: any
  loginfo
  showcalendar = false
  roleid
  hoveredDate: NgbDate | null = null
  fromDate: NgbDate
  toDate: NgbDate | null = null
  order: any = null
  invoice = null
  totalsales: number = 0
  totalpayments: number = 0
  transactionpayment = 0
  totalrefund: number = 0
  paymentpercent
  transaction: any
  OrderId = null
  Discount: number
  address: any
  city: any
  phone: any
  orderedDate: any
  AdditionalCharges: any = []
  CGST: number = 0
  SGST: number = 0
  IGST: number = 0
  PaidAmount: any
  masterdata = []

  constructor(
    private i18n: NzI18nService,
    private Auth: AuthService,
    private modalService: NgbModal,
    private calendar: NgbCalendar,
    public formatter: NgbDateParserFormatter,
    private printservice: PrintService,
  ) {
    this.UserId = null

    this.fromDate = calendar.getToday()
    this.toDate = calendar.getToday()
  }

  ngOnInit(): void {
    this.strdate = moment().format('YYYY-MM-DD')
    this.enddate = moment().format('YYYY-MM-DD')
    this.getReceipt()
    this.gettrans()
  }

  toggle() {
    if (this.show) this.buttonName = 'Back'
    else this.buttonName = 'Back'
  }
  openOrderpopup(orderDetail) {
    const modalRef = this.modalService
      .open(orderDetail, {
        ariaLabelledBy: 'modal-basic-title',
        centered: true,
      })
      .result.then(
        result => {},
        reason => {},
      )
  }

  timeout: any = null
  onKeySearch() {
    clearTimeout(this.timeout)
    var $this = this
    this.timeout = setTimeout(function() {
      $this.search()
    }, 500)
  }
  search() {
    if (this.term == '' || this.term == null) {
      this.receipts.receipts = this.masterdata
    } else {
      this.receipts.receipts = this.masterdata.filter(x =>
        x.invoiceNo.toLowerCase().includes(this.term.toLowerCase()),
      )
    }
  }

  getReceipt() {
    this.Auth.GetReceipts((this.StoreId = 26), this.strdate, this.enddate, this.invoice).subscribe(
      data => {
        this.receipts = data
        this.transactionpayment = 0
        console.log(this.receipts)

        this.receipts.receipts.forEach(rec => {
          this.totalsales += +rec.totalSales.toFixed(0)
          this.totalpayments += +rec.totalPayment.toFixed(0)
          this.totalrefund += +rec.totalRefund.toFixed(0)
        })
        this.masterdata = this.receipts.receipts
      },
    )
  }

  gettrans() {
    this.Auth.gettransaction(this.OrderId).subscribe(data => {
      this.transaction = data
      console.log(this.transaction)
    })
  }
  parseOrder(json_string) {
    this.order = JSON.parse(json_string)
    console.log(this.order)
    this.show = 1
  }
}

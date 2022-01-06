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
@Component({
  selector: 'app-receipt',
  templateUrl: './receipt.component.html',
  styleUrls: ['./receipt.component.scss'],
})
export class ReceiptComponent implements OnInit {
  dateRange = []

  onChange(result: Date): void {
    console.log('onChange: ', result)
    this.strdate = moment(result[0]).format('YYYY-MM-DD')
    this.enddate = moment(result[1]).format('YYYY-MM-DD')
    this.getReceipt()
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
  orderno: any
  Subtotal: number = 0
  Total: number = 0
  additionalCharge: number = 0
  element: any
  orderid: any
  CompanyId: any
  StoreId: any
  UserId: number
  OrderStauts: number
  AdditionalCharges: any = []
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
  constructor(
    private i18n: NzI18nService,
    private Auth: AuthService,
    private modalService: NgbModal,
    private calendar: NgbCalendar,
    public formatter: NgbDateParserFormatter,
  ) {
    this.UserId = null

    this.fromDate = calendar.getToday()
    this.toDate = calendar.getToday()
  }

  ngOnInit(): void {
    this.strdate = moment().format('YYYY-MM-DD')
    this.enddate = moment().format('YYYY-MM-DD')
    this.getReceipt()
  }

  toggle() {
    if (this.show) this.buttonName = 'Back'
    else this.buttonName = 'Back'
  }

  getReceipt() {
    this.Auth.GetReceipts((this.StoreId = 26), this.strdate, this.enddate, this.invoice).subscribe(
      data => {
        this.receipts = data
        console.log(this.receipts)
      },
    )
  }

  parseOrder(json_string) {
    this.order = JSON.parse(json_string)
    console.log(this.order)
    this.show = 1
  }
}

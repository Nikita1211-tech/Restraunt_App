import { Component, OnInit } from '@angular/core';
import { Booking, RestaurantDetails, Restraunt } from '../../interfaces/restraunt.interface';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import * as RestrauntActions from './../../store/actions/restraunt-list-actions';
import * as RestrauntSelectors from './../../store/selectors/restraunt-list-selectors';
import * as BookingSelectors from './../../store/selectors/booking-list-selectors';
import { ActivatedRoute, Router } from '@angular/router';
import { FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { MatIconRegistry } from '@angular/material/icon';
import { DomSanitizer } from '@angular/platform-browser';
import { ACTION, BOOKING_ADDED, BOOKING_UPDATED, NO_BOOKING_AVAILABLE, RESTAURANT_BOOKING_UNSUCCESSFUL, RESTAURANT_UPDATION_UNSUCCESSFUL } from '../../enum/messages-enum';
import { RestrauntService } from '../../services/restraunt.service';
import { formatDate } from '@angular/common';

@Component({
  selector: 'app-book-restraunt',
  templateUrl: './book-restraunt.component.html',
  styleUrl: './book-restraunt.component.css',
})
export class BookRestrauntComponent implements OnInit {
  restrauntForm: FormGroup;
  restrauntId!: number;
  restrauntList$!: Observable<Restraunt[]>;
  restrauntDetails = <RestaurantDetails>{};
  storedBookingList: Booking[] = [];
  timeIcon = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm0 448c-110.5 0-200-89.5-200-200S145.5 56 256 56s200 89.5 200 200-89.5 200-200 200zm61.8-104.4l-84.9-61.7c-3.1-2.3-4.9-5.9-4.9-9.7V116c0-6.6 5.4-12 12-12h32c6.6 0 12 5.4 12 12v141.7l66.8 48.6c5.4 3.9 6.5 11.4 2.6 16.8L334.6 349c-3.9 5.3-11.4 6.5-16.8 2.6z"/></svg>'
  minDate!: Date;
  maxDate!: Date;
  bookingId!: number;

  get Bookings() {
    return (<FormArray>this.restrauntForm.get('bookings')).controls;
  }

  constructor(private route: ActivatedRoute, private store: Store, private iconRegistry: MatIconRegistry,
    private sanitizer: DomSanitizer, private restrauntService: RestrauntService, private router: Router) {
    this.restrauntForm = new FormGroup({
      bookings: new FormArray([this.createRestaurantFormGroup()])
    })
    this.iconRegistry.addSvgIconLiteral('time-icon', this.sanitizer.bypassSecurityTrustHtml(this.timeIcon));
  }

  ngOnInit(): void {
    this.restrauntId = Number(this.route.snapshot.params['id']);
    this.bookingId = Number(this.route.snapshot.queryParams['bookingId']);
    this.restrauntList$ = this.store.select(RestrauntSelectors.selectAllRestraunt);

    // Date Validator 
    this.minDate = new Date();

    // Set maxDate to one month from today's date
    const maxDate = new Date();
    maxDate.setMonth(maxDate.getMonth() + 1);
    this.maxDate = maxDate;

    // Filters restraunt name according to id and used in mat checkbox for providing options
    this.restrauntList$.subscribe((value) => {
      if (value) {
        const currentRestrauntList = value.find(item => item.id === this.restrauntId);
        if (currentRestrauntList) {
          this.restrauntDetails.restaurantName = currentRestrauntList.restaurantName;
          this.restrauntDetails.tableSize = currentRestrauntList.tableSize.split(",");
          this.restrauntDetails.tableLocation = currentRestrauntList.tableLocation.split(",");
          this.restrauntDetails.timeSlot = currentRestrauntList.timeSlot.split(",");
        }
      }
    });

    // Fetches booking list and assigns id to recently added booking
    this.store.select(BookingSelectors.selectAllBookings).subscribe((value) => {
      this.storedBookingList = value;
      const currentBookingList = value.find(item => item.id === this.bookingId);

      // Prefill form value according to bookingId
      if (currentBookingList) {
        this.restrauntForm.patchValue({
          tableSize: currentBookingList.tableSize,
          tableLoc: currentBookingList.tableLoc,
          date: new Date(currentBookingList.date),
          time: currentBookingList.time
        })
      };
    });

    // Handles success case 
    this.successHandler();
    this.errorHandler();
  }

  canDeactivate(): boolean {
    return !this.restrauntForm.touched;
  }

  createRestaurantFormGroup(): FormGroup {
    return new FormGroup({
      tableSize: new FormControl('', Validators.required),
      tableLoc: new FormControl('', Validators.required),
      date: new FormControl('', Validators.required),
      time: new FormControl('', Validators.required)
    });
  }

  onAddBooking(): void {
    const control = this.restrauntForm.get('bookings') as FormArray;
    control.push(this.createRestaurantFormGroup());
    console.log(control)
  }

  // Submits form data 
  onSave(): void {
    if (this.restrauntForm.invalid) {
      return;
    }
    else {
      const restrauntFormValues: Booking[] = this.restrauntForm.value.bookings;
      restrauntFormValues.forEach((value) => {
        const date = formatDate(value.date, 'MM/dd/yyyy', 'en');
        const booking: Booking = {
          restaurantId: this.restrauntId,
          restaurantName: this.restrauntDetails.restaurantName,
          tableSize: value.tableSize,
          tableLoc: value.tableLoc,
          date: date,
          time: value.time
        };
        // Checks whether bookingId is present in params or not 
        if (this.bookingId) {
          const updatedBooking: Booking = {
            id: this.bookingId,
            restaurantId: this.restrauntId,
            restaurantName: this.restrauntDetails.restaurantName,
            tableSize: booking.tableSize,
            tableLoc: booking.tableLoc,
            date: formatDate(booking.date, 'MM/dd/yyyy', 'en'),
            time: booking.time
          }
          this.store.dispatch(RestrauntActions.updateBooking({ booking: updatedBooking }));
        }
        else {
          let alreadyExists: boolean = false;
          // Checks whether past bookings are present in list or not 
          if (this.storedBookingList.length > 0) {
            for (let i = 0; i < this.storedBookingList.length; i++) {
              if (this.storedBookingList[i].tableSize === booking.tableSize && this.storedBookingList[i].date === date
                && this.storedBookingList[i].time === booking.time) {
                this.restrauntService.openToastSuccess(NO_BOOKING_AVAILABLE, ACTION);
                alreadyExists = true;
                return;
              }
            }
            if (!alreadyExists) {
              this.addBooking(booking);
            }
          }
          else {
            this.addBooking(booking);
          }
        }
      })
    }
  }

  // Dispatches add book action 
  addBooking(newBooking: Booking): void {
    this.store.dispatch(RestrauntActions.addBooking({ booking: newBooking }));
  }

  successHandler(): void {
    this.store.select(BookingSelectors.selectBookingSuccess).subscribe((success) => {
      if (success) {
        switch (success) {
          case BOOKING_ADDED:
            this.router.navigate(['restraunt/Bookings']);
            this.store.dispatch(RestrauntActions.loadBooking());
            this.restrauntService.openToastSuccess(BOOKING_ADDED, ACTION);
            this.store.dispatch(RestrauntActions.resetSuccessMessage());
            return;
          case BOOKING_UPDATED:
            this.router.navigate(['restraunt/Bookings']);
            this.store.dispatch(RestrauntActions.loadBooking());
            this.restrauntService.openToastSuccess(BOOKING_UPDATED, ACTION);
            this.store.dispatch(RestrauntActions.resetSuccessMessage());
            return;
          default:
            return;
        }
      }
    });
  }

  errorHandler(): void {
    this.store.select(BookingSelectors.selectBookingError).subscribe((error) => {
      if (error) {
        switch (error) {
          case RESTAURANT_BOOKING_UNSUCCESSFUL:
            this.restrauntService.openToastSuccess(RESTAURANT_BOOKING_UNSUCCESSFUL, ACTION);
            this.store.dispatch(RestrauntActions.resetErrorMessage());
            return;
          case RESTAURANT_UPDATION_UNSUCCESSFUL:
            this.restrauntService.openToastSuccess(RESTAURANT_UPDATION_UNSUCCESSFUL, ACTION);
            this.store.dispatch(RestrauntActions.resetErrorMessage());
            return;
          default:
            return;
        }
      }
    });
  }
}


import { Component, OnInit } from '@angular/core';
import { Store } from '@ngrx/store';
import * as RestrauntActions from './store/actions/restraunt-list-actions';
import * as BookingSelectors from './store/selectors/booking-list-selectors';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'Restraunt_App';
  loading$!: Observable<boolean>

  constructor(private store: Store) { }

  ngOnInit(): void {
    this.store.dispatch(RestrauntActions.loadRestraunt());
    this.store.dispatch(RestrauntActions.loadBooking());
    this.loading$ = this.store.select(BookingSelectors.selectLoader);
  }
}

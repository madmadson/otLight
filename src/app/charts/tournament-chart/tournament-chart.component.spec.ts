import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { TournamentChartComponent } from './tournament-chart.component';

describe('TournamentChartComponent', () => {
  let component: TournamentChartComponent;
  let fixture: ComponentFixture<TournamentChartComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ TournamentChartComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TournamentChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

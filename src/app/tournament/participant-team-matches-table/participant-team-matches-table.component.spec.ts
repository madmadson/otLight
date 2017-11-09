import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipantMatchesTableComponent } from './participant-team-matches-table.component';

describe('ParticipantMatchesTableComponent', () => {
  let component: ParticipantMatchesTableComponent;
  let fixture: ComponentFixture<ParticipantMatchesTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ParticipantMatchesTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParticipantMatchesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

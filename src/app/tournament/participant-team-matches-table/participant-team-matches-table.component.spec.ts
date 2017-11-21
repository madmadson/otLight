import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ParticipantTeamMatchesTableComponent } from './participant-team-matches-table.component';

describe('ParticipantMatchesTableComponent', () => {
  let component: ParticipantTeamMatchesTableComponent;
  let fixture: ComponentFixture<ParticipantTeamMatchesTableComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ParticipantTeamMatchesTableComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(ParticipantTeamMatchesTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

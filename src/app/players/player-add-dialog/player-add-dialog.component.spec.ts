import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { PlayerAddDialogComponent } from './player-add-dialog.component';

describe('PlayerAddDialogComponent', () => {
  let component: PlayerAddDialogComponent;
  let fixture: ComponentFixture<PlayerAddDialogComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ PlayerAddDialogComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PlayerAddDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

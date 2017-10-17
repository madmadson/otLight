import { TestBed, inject } from '@angular/core/testing';

import { RoundMatchService } from './round-match.service';

describe('RoundMatchService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [RoundMatchService]
    });
  });

  it('should be created', inject([RoundMatchService], (service: RoundMatchService) => {
    expect(service).toBeTruthy();
  }));
});

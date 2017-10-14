import { TestBed, inject } from '@angular/core/testing';

import { GameSystemService } from './game-system.service';

describe('GameSystemService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [GameSystemService]
    });
  });

  it('should be created', inject([GameSystemService], (service: GameSystemService) => {
    expect(service).toBeTruthy();
  }));
});

import { TestBed } from '@angular/core/testing';

import { VoiceNotificationService } from './voice-notification.service';

describe('VoiceNotificationService', () => {
  let service: VoiceNotificationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VoiceNotificationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

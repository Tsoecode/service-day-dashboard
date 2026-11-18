import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { combineLatest, map } from 'rxjs';
import { Activity, Registration } from '../../../core/models';
import { ActivityService, CheckInService, ClockService, RegistrationService, ToastService } from '../../../core/services';

/** Extracts the activity token from a scanned value (full URL or the plain code). */
export function extractCode(raw: string): string {
  const text = raw.trim();
  try { return new URL(text).searchParams.get('code') ?? text; } catch { return text; }
}

@Component({
  standalone: false,
  selector: 'app-check-in',
  templateUrl: './check-in.component.html',
  styleUrl: './check-in.component.scss'
})
export class CheckInComponent implements OnInit, OnDestroy {
  @ViewChild('video') video?: ElementRef<HTMLVideoElement>;

  code = '';
  busy = false;
  error = '';
  result: { registration: Registration; activity: Activity } | null = null;
  scanning = false;
  readonly cameraSupported = typeof (window as any).BarcodeDetector !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  private stream: MediaStream | null = null;
  private timer = 0;

  readonly mine$ = combineLatest([this.activities.activities$, this.registrations.registrations$, this.clock.now$]).pipe(
    map(([activities, regs, now]) => {
      const byId = new Map(activities.map(a => [a.id, a]));
      return regs
        .map(r => ({ reg: r, activity: byId.get(r.activityId)! }))
        .filter(x => x.activity && new Date(x.activity.endAt).getTime() > now - 24 * 3600_000 && new Date(x.activity.startAt).getTime() < now + 24 * 3600_000);
    })
  );

  constructor(
    private route: ActivatedRoute, private checkInService: CheckInService, private activities: ActivityService,
    private registrations: RegistrationService, private clock: ClockService, private toast: ToastService
  ) {}

  ngOnInit(): void {
    const fromLink = this.route.snapshot.queryParamMap.get('code');
    if (fromLink) { this.code = fromLink; this.submit(); }
  }

  submit(): void {
    this.error = '';
    this.result = null;
    const token = extractCode(this.code);
    if (!token) { this.error = 'Enter or scan the QR code shown at the activity.'; return; }
    this.busy = true;
    this.checkInService.checkIn(token).subscribe({
      next: res => {
        this.busy = false;
        this.result = res;
        this.code = '';
        this.stopCamera();
        this.toast.success('Check-in recorded. Thank you for volunteering!');
      },
      error: (e: HttpErrorResponse) => { this.busy = false; this.error = e.error?.message ?? 'Check-in failed.'; }
    });
  }

  async startCamera(): Promise<void> {
    this.error = '';
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      this.scanning = true;
      setTimeout(() => this.attachVideo(), 0);
    } catch {
      this.error = 'Camera access was denied. You can type the code instead.';
    }
  }

  stopCamera(): void {
    window.clearInterval(this.timer);
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
    this.scanning = false;
  }

  ngOnDestroy(): void { this.stopCamera(); }

  private attachVideo(): void {
    const el = this.video?.nativeElement;
    if (!el || !this.stream) return;
    el.srcObject = this.stream;
    void el.play();
    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
    this.timer = window.setInterval(async () => {
      try {
        const codes = await detector.detect(el);
        if (codes.length && !this.busy) { this.code = codes[0].rawValue; this.submit(); }
      } catch { /* frame not ready */ }
    }, 600);
  }
}

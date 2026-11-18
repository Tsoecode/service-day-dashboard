import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ActivityCardComponent } from './components/activity-card/activity-card.component';
import { BarChartComponent } from './components/bar-chart/bar-chart.component';
import { DonutChartComponent } from './components/donut-chart/donut-chart.component';
import { IconComponent } from './components/icon/icon.component';
import { ModalComponent } from './components/modal/modal.component';
import { StatCardComponent } from './components/stat-card/stat-card.component';
import { StatusBadgeComponent } from './components/status-badge/status-badge.component';
import { ToastContainerComponent } from './components/toast-container/toast-container.component';
import { TimeUntilPipe } from './pipes/time-until.pipe';

const SHARED = [
  IconComponent, StatCardComponent, ModalComponent, ToastContainerComponent, DonutChartComponent,
  BarChartComponent, StatusBadgeComponent, ActivityCardComponent, TimeUntilPipe
];

/** Reusable presentational building blocks shared by every feature module. */
@NgModule({
  declarations: SHARED,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule],
  exports: [CommonModule, FormsModule, ReactiveFormsModule, RouterModule, ...SHARED]
})
export class SharedModule {}

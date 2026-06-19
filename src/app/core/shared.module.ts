import { NgModule } from "@angular/core";
import { FirstLetterPipe } from "../pipes/first-letter.pipe";
import { FileSizePipe } from "../pipes/file-size.pipe";
import { PlaceholderPipe } from "../pipes/placeholder.pipe";
import { TimeZonePipe } from "../pipes/time-zone.pipe";
import { ResizableDirective } from "../directives/resizable.directive";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { QRCodeComponent } from "angularx-qrcode";

import { ButtonLoaderDirective } from "../directives/button-loader.directive";
import { CurrencyFormatPipe } from "../pipes/currency-format.pipe";

@NgModule({
  declarations: [
    FirstLetterPipe,
    FileSizePipe,
    PlaceholderPipe,
    TimeZonePipe,
    ResizableDirective,
    CurrencyFormatPipe,
    ButtonLoaderDirective,
  ],
  exports: [
    FirstLetterPipe,
    FileSizePipe,
    PlaceholderPipe,
    TimeZonePipe,
    ResizableDirective,
    CurrencyFormatPipe,
    ButtonLoaderDirective,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    QRCodeComponent,
  ],
})
export class SharedModule {}

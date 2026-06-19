import { Component, inject } from "@angular/core";
import { CommonModule } from "@angular/common";
import { LoaderService } from "../../pages/services/loader.service";

@Component({
  selector: "app-loader",
  templateUrl: "./loader.component.html",
  styleUrl: "./loader.component.css",
})
export class LoaderComponent {
  loaderService = inject(LoaderService);
}
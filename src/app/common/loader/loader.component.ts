import { Component, inject } from "@angular/core";
import { LoaderService } from "../../pages/services/loader.service";

@Component({
  selector: "app-loader",
  templateUrl: "./loader.component.html",
  styleUrl: "./loader.component.css",
})
export class LoaderComponent {
  loaderService = inject(LoaderService);
}

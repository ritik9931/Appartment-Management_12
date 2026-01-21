import { Component } from '@angular/core';
import { NgModule } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { ReactiveFormsModule, FormGroup} from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [ RouterModule, ReactiveFormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  
  title = 'Appartment_Management';
}

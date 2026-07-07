import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { User } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  getAll(): Observable<User[]> {
    return of([]);
  }
}

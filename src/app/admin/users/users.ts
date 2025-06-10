import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserService, User } from '../../services/user.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class Users implements OnInit, OnDestroy {
  users: User[] = [];
  filteredUsers: User[] = [];
  loading = false;
  error = '';
  success = '';
  searchTerm = '';
  private subscription: Subscription = new Subscription();
  
  constructor(
    private userService: UserService,
    private router: Router
  ) {
    this.loadUsers();
  }
  
  ngOnInit() {
    // Nothing needed here as we load in constructor
  }
  
  ngOnDestroy() {
    this.subscription.unsubscribe();
  }
  
  loadUsers() {
    this.error = '';
    
    const sub = this.userService.getUsers().subscribe({
      next: (users) => {
        console.log('Users component received users:', users.length);
        this.users = users;
        this.applyFilter();
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message || 'Failed to load users';
        this.users = [];
        this.filteredUsers = [];
        this.loading = false;
        console.error('Error loading users:', err);
      }
    });
    
    this.subscription.add(sub);
  }
  
  applyFilter() {
    if (!this.searchTerm) {
      this.filteredUsers = [...this.users];
      return;
    }
    
    const searchTermLower = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(user => 
      user.name.toLowerCase().includes(searchTermLower) || 
      user.email.toLowerCase().includes(searchTermLower) ||
      user.role.toLowerCase().includes(searchTermLower)
    );
  }
  
  deleteUser(id: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      const sub = this.userService.deleteUser(id).subscribe({
        next: () => {
          this.success = 'User deleted successfully';
          this.loadUsers();
        },
        error: (err) => {
          this.error = err.message || 'Failed to delete user';
          this.loading = false;
          console.error('Error deleting user:', err);
        }
      });
      
      this.subscription.add(sub);
    }
  }
  
  editUser(id: string) {
    this.router.navigate(['/admin/users/edit', id]);
  }
  
  createUser() {
    this.router.navigate(['/admin/users/create']);
  }
}

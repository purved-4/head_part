import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AddBranchUserComponent } from './add-branch-user.component';

 
describe('addBranchUserComponent', () => {
  let component: AddBranchUserComponent;
  let fixture: ComponentFixture<AddBranchUserComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddBranchUserComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddBranchUserComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

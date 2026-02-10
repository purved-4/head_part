

export interface Role {
  id: string;
  name: string;
}

export interface CurrentUser {
  branchId?: string;
  headId?: string;
  whoId?: string;
  managerId?: string;
  chiefId?: string;
  userId: string;
  username: string;
  role: Role[];

websiteId?: string;
}
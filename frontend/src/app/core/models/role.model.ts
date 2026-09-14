export interface RolePermissionMatrixItem {
  role: string;
  displayName: string;
  description: string;
  permissions: string[];
}

export interface PermissionDefinition {
  code: string;
  label: string;
  description: string;
}

export interface PermissionGroup {
  moduleName: string;
  icon: string;
  permissions: PermissionDefinition[];
}

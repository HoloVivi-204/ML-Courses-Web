export interface LocalAuthUser {
  displayName: string;
  email: string;
  emailVerified: boolean;
  uid: string;
}

export interface LocalFirestoreDocument {
  data: Readonly<Record<string, boolean | number | string>>;
  path: string;
}

export interface LocalStorageObject {
  content: string;
  contentType: string;
  path: string;
}

export interface LocalSeedManifest {
  authUsers: readonly LocalAuthUser[];
  firestoreDocuments: readonly LocalFirestoreDocument[];
  storageObjects: readonly LocalStorageObject[];
  version: number;
}

export function createLocalSeedManifest(): LocalSeedManifest {
  return {
    version: 1,
    authUsers: [
      {
        uid: 'local-student',
        email: 'student@example.test',
        emailVerified: true,
        displayName: 'Local Student',
      },
    ],
    firestoreDocuments: [
      {
        path: 'system/local-seed',
        data: {
          environment: 'local',
          schemaVersion: 1,
          seeded: true,
        },
      },
    ],
    storageObjects: [
      {
        path: 'local-seed/manifest.json',
        contentType: 'application/json',
        content: '{"environment":"local","schemaVersion":1,"seeded":true}\n',
      },
    ],
  };
}

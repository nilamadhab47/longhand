import type { SectionKind } from "@prisma/client";

export type TreeSection = {
  id: string;
  kind: SectionKind;
  empty: boolean;
};

export type TreeNote = {
  id: string;
  title: string;
  folderId: string;
  position: number;
  due: boolean;
  sections: TreeSection[];
};

export type TreeFolder = {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  position: number;
  children: TreeFolder[];
  notes: TreeNote[];
};

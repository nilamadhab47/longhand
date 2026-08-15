-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "ExamPaper" AS ENUM ('GS1', 'GS2', 'GS3', 'GS4', 'OPTIONAL_ANTHROPOLOGY', 'ESSAY', 'PRELIMS_GS', 'PRELIMS_CSAT');

-- CreateEnum
CREATE TYPE "SectionKind" AS ENUM ('KEYWORDS', 'QUOTATIONS', 'NOTES', 'QUESTIONS');

-- CreateEnum
CREATE TYPE "QuotationSource" AS ENUM ('SCHOLAR', 'JUDGMENT', 'COMMITTEE_REPORT', 'CONSTITUENT_ASSEMBLY', 'ARTICLE_TEXT', 'OTHER');

-- CreateEnum
CREATE TYPE "QuestionKind" AS ENUM ('MCQ', 'PRELIMS_STATEMENT', 'MAINS_DESCRIPTIVE');

-- CreateEnum
CREATE TYPE "QuestionOrigin" AS ENUM ('USER_WRITTEN', 'AI_EXTRACTED', 'PYQ_LINKED');

-- CreateEnum
CREATE TYPE "AuditStatus" AS ENUM ('UNAUDITED', 'PENDING', 'PASSED', 'FLAGGED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "folders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "defaultPaper" "ExamPaper",
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "folders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "paper" "ExamPaper" NOT NULL,
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "intervalDays" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3),
    "lastReviewedAt" TIMESTAMP(3),
    "embedding" vector(1536),
    "syllabusMatchCache" JSONB,
    "auditResult" JSONB,
    "auditStatus" "AuditStatus" NOT NULL DEFAULT 'UNAUDITED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "note_sections" (
    "id" TEXT NOT NULL,
    "noteId" TEXT NOT NULL,
    "kind" "SectionKind" NOT NULL,
    "position" INTEGER NOT NULL,
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "content" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "note_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "attributedTo" TEXT NOT NULL,
    "sourceType" "QuotationSource" NOT NULL,
    "year" INTEGER,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "noteId" TEXT,
    "kind" "QuestionKind" NOT NULL,
    "origin" "QuestionOrigin" NOT NULL,
    "stem" TEXT NOT NULL,
    "options" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "correctIndices" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "explanation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "selectedIndices" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "writtenAnswer" TEXT,
    "isCorrect" BOOLEAN,
    "auditResult" JSONB,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paste_route_cache" (
    "hash" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paste_route_cache_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "api_spend" (
    "month" TEXT NOT NULL,
    "usd" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "api_spend_pkey" PRIMARY KEY ("month")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "folders_userId_parentId_idx" ON "folders"("userId", "parentId");

-- CreateIndex
CREATE INDEX "notes_userId_nextReviewAt_idx" ON "notes"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "notes_folderId_title_key" ON "notes"("folderId", "title");

-- CreateIndex
CREATE UNIQUE INDEX "note_sections_noteId_kind_key" ON "note_sections"("noteId", "kind");

-- CreateIndex
CREATE INDEX "quotations_sourceType_attributedTo_idx" ON "quotations"("sourceType", "attributedTo");

-- CreateIndex
CREATE INDEX "questions_userId_noteId_idx" ON "questions"("userId", "noteId");

-- CreateIndex
CREATE INDEX "attempts_questionId_attemptedAt_idx" ON "attempts"("questionId", "attemptedAt");

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "folders" ADD CONSTRAINT "folders_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "folders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "note_sections" ADD CONSTRAINT "note_sections_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "note_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_noteId_fkey" FOREIGN KEY ("noteId") REFERENCES "notes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

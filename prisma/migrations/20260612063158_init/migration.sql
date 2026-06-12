-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'DEVELOPER', 'VIEWER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETE', 'FAILED');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('SECURITY', 'PERFORMANCE', 'STYLE');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "githubLogin" TEXT NOT NULL,
    "email" TEXT,
    "role" "Role" NOT NULL DEFAULT 'DEVELOPER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Repository" (
    "id" TEXT NOT NULL,
    "githubRepoId" INTEGER NOT NULL,
    "owner" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "installId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "prTitle" TEXT NOT NULL,
    "prAuthor" TEXT NOT NULL,
    "prUrl" TEXT NOT NULL,
    "baseBranch" TEXT NOT NULL,
    "headBranch" TEXT NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "repositoryId" TEXT NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Finding" (
    "id" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "lineStart" INTEGER NOT NULL,
    "lineEnd" INTEGER,
    "category" "Category" NOT NULL,
    "severity" "Severity" NOT NULL,
    "ruleId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "suggestion" TEXT NOT NULL,
    "suppressed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewId" TEXT NOT NULL,

    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rule" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "defaultSeverity" "Severity" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Rule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ruleset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "repositoryId" TEXT NOT NULL,
    "overrides" JSONB NOT NULL,

    CONSTRAINT "Ruleset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RepoMembers" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RepoMembers_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_RuleToRuleset" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RuleToRuleset_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_githubLogin_key" ON "User"("githubLogin");

-- CreateIndex
CREATE UNIQUE INDEX "Repository_githubRepoId_key" ON "Repository"("githubRepoId");

-- CreateIndex
CREATE INDEX "Finding_reviewId_idx" ON "Finding"("reviewId");

-- CreateIndex
CREATE INDEX "Finding_severity_idx" ON "Finding"("severity");

-- CreateIndex
CREATE INDEX "Finding_category_idx" ON "Finding"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Rule_slug_key" ON "Rule"("slug");

-- CreateIndex
CREATE INDEX "_RepoMembers_B_index" ON "_RepoMembers"("B");

-- CreateIndex
CREATE INDEX "_RuleToRuleset_B_index" ON "_RuleToRuleset"("B");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "Rule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ruleset" ADD CONSTRAINT "Ruleset_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RepoMembers" ADD CONSTRAINT "_RepoMembers_A_fkey" FOREIGN KEY ("A") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RepoMembers" ADD CONSTRAINT "_RepoMembers_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RuleToRuleset" ADD CONSTRAINT "_RuleToRuleset_A_fkey" FOREIGN KEY ("A") REFERENCES "Rule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RuleToRuleset" ADD CONSTRAINT "_RuleToRuleset_B_fkey" FOREIGN KEY ("B") REFERENCES "Ruleset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

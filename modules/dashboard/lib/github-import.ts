import { Templates } from "@prisma/client";
import path from "path";
import type { TemplateFile as TemplateJsonFile, TemplateFolder } from "@/modules/playgrounds/lib/path-to-json";

const MAX_IMPORT_FILE_SIZE = 1024 * 1024;

export interface GitHubRepoImportInput {
  repoUrl: string;
  title?: string;
  branch?: string;
}

interface GitHubRepoReference {
  owner: string;
  repo: string;
  branch?: string;
}

interface GitHubRepoMetadata {
  name: string;
  full_name: string;
  default_branch: string;
}

interface GitHubContentItem {
  type: "file" | "dir" | "symlink" | "submodule";
  path: string;
  name: string;
  size?: number;
  download_url?: string | null;
  content?: string;
  encoding?: string;
}

interface ImportedFile {
  path: string;
  content: string;
}

const binaryExtensions = new Set([
  "7z",
  "avi",
  "bin",
  "bmp",
  "class",
  "dll",
  "doc",
  "docx",
  "exe",
  "gif",
  "ico",
  "jar",
  "jpeg",
  "jpg",
  "mp3",
  "mp4",
  "pdf",
  "png",
  "psd",
  "rar",
  "ttf",
  "webm",
  "webp",
  "woff",
  "woff2",
  "zip",
]);

function encodePathSegments(value: string): string {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function parseGitHubRepoReference(repoUrl: string): GitHubRepoReference {
  const trimmed = repoUrl.trim();

  if (!trimmed) {
    throw new Error("Repository URL is required");
  }

  let pathname = trimmed;

  if (trimmed.includes("github.com")) {
    const normalizedUrl = trimmed.startsWith("http")
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(normalizedUrl);

    if (parsed.hostname !== "github.com" && !parsed.hostname.endsWith(".github.com")) {
      throw new Error("Please enter a valid GitHub repository URL.");
    }

    pathname = parsed.pathname;
  }

  const segments = pathname.split("/").filter(Boolean);

  if (segments.length < 2) {
    throw new Error("Please enter a repository in the form owner/repo.");
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, "");
  let branch: string | undefined;

  if (segments[2] === "tree" && segments[3]) {
    branch = decodeURIComponent(segments[3]);
  }

  return {
    owner,
    repo,
    branch,
  };
}

async function fetchGitHubJson<T>(
  url: string,
  token?: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(
      `GitHub request failed (${response.status}): ${message || response.statusText}`,
    );
  }

  return response.json() as Promise<T>;
}

async function resolveRepoFileContent(
  item: GitHubContentItem,
  token?: string,
): Promise<string | null> {
  const extension = item.path.includes(".")
    ? item.path.split(".").pop()?.toLowerCase()
    : "";

  if (extension && binaryExtensions.has(extension)) {
    return null;
  }

  if (item.size && item.size > MAX_IMPORT_FILE_SIZE) {
    return `[Skipped during GitHub import: file exceeds ${MAX_IMPORT_FILE_SIZE} bytes]`;
  }

  if (item.encoding === "base64" && item.content) {
    return Buffer.from(item.content, "base64").toString("utf8");
  }

  if (item.download_url) {
    const response = await fetch(item.download_url, {
      headers: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : undefined,
      cache: "no-store",
    });

    if (!response.ok) {
      return `[Skipped during GitHub import: unable to fetch ${item.path}]`;
    }

    return response.text();
  }

  return `[Skipped during GitHub import: content unavailable for ${item.path}]`;
}

async function collectRepoFiles(
  owner: string,
  repo: string,
  branch: string,
  token?: string,
  currentPath = "",
): Promise<ImportedFile[]> {
  const encodedPath = currentPath ? `/${encodePathSegments(currentPath)}` : "";
  const url = `https://api.github.com/repos/${owner}/${repo}/contents${encodedPath}?ref=${encodeURIComponent(branch)}`;
  const contents = await fetchGitHubJson<GitHubContentItem | GitHubContentItem[]>(
    url,
    token,
  );

  const items = Array.isArray(contents) ? contents : [contents];
  const files: ImportedFile[] = [];

  for (const item of items) {
    if (item.type === "dir") {
      const nestedFiles = await collectRepoFiles(owner, repo, branch, token, item.path);
      files.push(...nestedFiles);
      continue;
    }

    if (item.type !== "file") {
      continue;
    }

    const content = await resolveRepoFileContent(item, token);
    if (content === null) {
      continue;
    }

    files.push({
      path: item.path,
      content,
    });
  }

  return files;
}

function upsertTemplateItem(
  folder: TemplateFolder,
  filePath: string,
  content: string,
): void {
  const segments = filePath.split("/").filter(Boolean);
  if (segments.length === 0) {
    return;
  }

  const [currentSegment, ...rest] = segments;
  const isLeaf = rest.length === 0;

  if (isLeaf) {
    const parsed = path.posix.parse(currentSegment);
    const extension = parsed.ext.replace(/^\./, "");
    const filename = parsed.name || currentSegment;

    folder.items.push({
      filename,
      fileExtension: extension,
      content,
    } satisfies TemplateJsonFile);
    return;
  }

  let childFolder = folder.items.find(
    (item): item is TemplateFolder =>
      "folderName" in item && item.folderName === currentSegment,
  );

  if (!childFolder) {
    childFolder = {
      folderName: currentSegment,
      items: [],
    };
    folder.items.push(childFolder);
  }

  upsertTemplateItem(childFolder, rest.join("/"), content);
}

function buildTemplateFolder(repoName: string, files: ImportedFile[]): TemplateFolder {
  const root: TemplateFolder = {
    folderName: repoName,
    items: [],
  };

  for (const file of files) {
    upsertTemplateItem(root, file.path, file.content);
  }

  return root;
}

function detectTemplateFromPackageJson(content: string | undefined): Templates {
  if (!content) {
    return Templates.REACT;
  }

  try {
    const pkg = JSON.parse(content) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const dependencies = {
      ...(pkg.dependencies || {}),
      ...(pkg.devDependencies || {}),
    };

    if (dependencies.next) return Templates.NEXTJS;
    if (dependencies.express) return Templates.EXPRESS;
    if (dependencies.hono) return Templates.HONO;
    if (dependencies.vue) return Templates.VUE;
    if (dependencies["@angular/core"] || dependencies.angular) return Templates.ANGULAR;
    if (dependencies.react || dependencies["react-dom"] || dependencies["react-scripts"]) {
      return Templates.REACT;
    }
  } catch {
    return Templates.REACT;
  }

  return Templates.REACT;
}

export async function importGitHubRepository(
  input: GitHubRepoImportInput,
  token?: string,
): Promise<{
  title: string;
  description: string;
  template: Templates;
  templateData: TemplateFolder;
}> {
  const { owner, repo, branch: urlBranch } = parseGitHubRepoReference(input.repoUrl);

  const metadata = await fetchGitHubJson<GitHubRepoMetadata>(
    `https://api.github.com/repos/${owner}/${repo}`,
    token,
  );

  const branch = input.branch?.trim() || urlBranch || metadata.default_branch;

  const files = await collectRepoFiles(owner, repo, branch, token);
  const templateData = buildTemplateFolder(metadata.name, files);
  const packageJson = files.find((file) => file.path === "package.json")?.content;

  return {
    title: input.title?.trim() || metadata.name,
    description: `Imported from GitHub: ${metadata.full_name}`,
    template: detectTemplateFromPackageJson(packageJson),
    templateData,
  };
}

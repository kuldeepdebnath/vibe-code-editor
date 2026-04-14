import type {
  TemplateFile,
  TemplateFolder as PlaygroundTemplateFolder,
} from "@/modules/playgrounds/lib/path-to-json";

interface WebContainerFile {
  file: {
    contents: string;
  };
}

interface WebContainerDirectory {
  directory: {
    [key: string]: WebContainerFile | WebContainerDirectory;
  };
}

type WebContainerFileSystem = Record<string, WebContainerFile | WebContainerDirectory>;
type TemplateItem = TemplateFile | PlaygroundTemplateFolder;

const isFolder = (item: TemplateItem): item is PlaygroundTemplateFolder =>
  "folderName" in item;

const isFile = (item: TemplateItem): item is TemplateFile =>
  "filename" in item;

export function transformToWebContainerFormat(
  template: PlaygroundTemplateFolder
): WebContainerFileSystem {
  function processItem(item: TemplateItem): WebContainerFile | WebContainerDirectory {
    if (isFolder(item)) {
      // This is a directory
      const directoryContents: WebContainerFileSystem = {};
      
      item.items.forEach((subItem) => {
        const key = isFile(subItem)
          ? `${subItem.filename}${subItem.fileExtension ? "." + subItem.fileExtension : ""}`
          : subItem.folderName;
        directoryContents[key] = processItem(subItem);
      });

      return {
        directory: directoryContents
      };
    } else {
      // This is a file
      return {
        file: {
          contents: item.content
        }
      };
    }
  }

  const result: WebContainerFileSystem = {};
  
  template.items.forEach((item) => {
    const key = isFile(item)
          ? `${item.filename}${item.fileExtension ? "." + item.fileExtension : ""}`
      : item.folderName;
    result[key] = processItem(item);
  });

  return result;
}

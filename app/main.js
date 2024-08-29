const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");


const command = process.argv[2];

switch (command) {
  case "init":
    createGitDirectory();
    break;

  case "cat-file":
    const flag = process.argv[3];
    const blobSHA = process.argv[4];
    if (flag === "-p") {
      prettyPrintObject(blobSHA);
    } else {
      throw new Error(`Unknown flag ${flag}`);
    }
    break;

  case "hash-object":
    const writeFlag = process.argv[3];
    const fileName = process.argv[4];
    if (writeFlag === "-w") {
      hashObject(fileName);
    } else {
      throw new Error(`Unknown flag ${writeFlag}`);
    }
    break;

  case "ls-tree":
    const lsFlag = process.argv[3];
    const treeSHA = process.argv[4];
    if (lsFlag === "--name-only") {
      lsTreeNameOnly(treeSHA);
    } else {
      throw new Error(`Unknown flag ${lsFlag}`);
    }
    break;
    case "write-tree":
    writeTree();
    break;

  default:
    throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
  fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
  fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });

  fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
  console.log("Initialized git directory");
}

function prettyPrintObject(blobSHA) {
  const blobPath = path.join(process.cwd(), ".git", "objects", blobSHA.slice(0, 2), blobSHA.slice(2));
  const blobData = fs.readFileSync(blobPath);
  const decompressedData = zlib.inflateSync(blobData).toString("utf-8");
  const content = decompressedData.split("\0")[1];
  process.stdout.write(content); // No newline at the end
}

function hashObject(fileName) {
  const fileContent = fs.readFileSync(fileName);
  const header = `blob ${fileContent.length}\0`;
  const store = header + fileContent;
  const sha1Hash = crypto.createHash("sha1").update(store).digest("hex");

  const objectPath = path.join(process.cwd(), ".git", "objects", sha1Hash.slice(0, 2));
  if (!fs.existsSync(objectPath)) {
    fs.mkdirSync(objectPath);
  }

  const filePath = path.join(objectPath, sha1Hash.slice(2));
  const compressedData = zlib.deflateSync(store);
  fs.writeFileSync(filePath, compressedData);

  console.log(sha1Hash);
}

function lsTreeNameOnly(treeSHA) {
  const treePath = path.join(process.cwd(), ".git", "objects", treeSHA.slice(0, 2), treeSHA.slice(2));
  const treeData = fs.readFileSync(treePath);
  const decompressedData = zlib.inflateSync(treeData);

  let index = 0;
  const entries = [];

  // Ensure the decompressed data has the correct tree header
  if (!decompressedData.slice(0, 4).equals(Buffer.from('tree'))) {
    throw new Error("Invalid tree object format");
  }

  // Skip the 'tree <size>\0' header
  index = decompressedData.indexOf(0) + 1;

  while (index < decompressedData.length) {
    // Find mode
    const modeEnd = decompressedData.indexOf(32, index); // Space ' ' delimiter
    const mode = decompressedData.slice(index, modeEnd).toString(); // Mode is a string

    // Find name
    const nameEnd = decompressedData.indexOf(0, modeEnd + 1); // Null byte '\0' delimiter
    const name = decompressedData.slice(modeEnd + 1, nameEnd).toString(); // Name is a string

    entries.push(name);

    // Advance index past the entry (mode + name + null byte + 20-byte SHA1)
    index = nameEnd + 1 + 20; // Move past the SHA-1 hash
  }

  // Alphabetical sorting
  entries.sort();

  // Output each name
  entries.forEach((entry) => console.log(entry));
}


function writeTree() {
  const rootTreeSHA = writeTreeRecursive(process.cwd());
  console.log(rootTreeSHA);
}

function writeTreeRecursive(dir) {
  let treeEntries = [];

  const files = fs.readdirSync(dir);

  files.forEach(file => {
    if (file === ".git") return; // Skip .git directory

    const filePath = path.join(dir, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      const subTreeSHA = writeTreeRecursive(filePath);
      const mode = "040000";
      treeEntries.push(Buffer.concat([Buffer.from(`${mode} ${file}\0`), Buffer.from(subTreeSHA, "hex")]));
    } else if (stats.isFile()) {
      const blobSHA = hashObject(filePath);
      const mode = (stats.mode & 0o111) ? "100755" : "100644"; // Executable or regular file
      treeEntries.push(Buffer.concat([Buffer.from(`${mode} ${file}\0`), Buffer.from(blobSHA, "hex")]));
    }
  });

  // Concatenate tree entries and calculate tree SHA
  const treeData = Buffer.concat(treeEntries);
  const header = Buffer.from(`tree ${treeData.length}\0`);
  const store = Buffer.concat([header, treeData]);

  const treeSHA = crypto.createHash("sha1").update(store).digest("hex");

  const objectPath = path.join(process.cwd(), ".git", "objects", treeSHA.slice(0, 2));
  if (!fs.existsSync(objectPath)) {
    fs.mkdirSync(objectPath);
  }

  const filePath = path.join(objectPath, treeSHA.slice(2));
  const compressedData = zlib.deflateSync(store);
  fs.writeFileSync(filePath, compressedData);

  return treeSHA;
}

function hashObject(filePath) {
  const fileContent = fs.readFileSync(filePath);
  const header = `blob ${fileContent.length}\0`;
  const store = Buffer.concat([Buffer.from(header), fileContent]);
  const sha1Hash = crypto.createHash("sha1").update(store).digest("hex");

  const objectPath = path.join(process.cwd(), ".git", "objects", sha1Hash.slice(0, 2));
  if (!fs.existsSync(objectPath)) {
    fs.mkdirSync(objectPath);
  }

  const filePathHash = path.join(objectPath, sha1Hash.slice(2));
  const compressedData = zlib.deflateSync(store);
  fs.writeFileSync(filePathHash, compressedData);

  return sha1Hash;
}
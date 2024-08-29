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
  const gitDir = path.join(process.cwd(), ".git");
  fs.mkdirSync(gitDir, { recursive: true });
  fs.mkdirSync(path.join(gitDir, "objects"), { recursive: true });
  fs.mkdirSync(path.join(gitDir, "refs"), { recursive: true });

  fs.writeFileSync(path.join(gitDir, "HEAD"), "ref: refs/heads/main\n");
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
  const header = Buffer.from(`blob ${fileContent.length}\0`);
  const store = Buffer.concat([header, fileContent]);
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

  // Skip the 'tree <size>\0' header
  index = decompressedData.indexOf(0) + 1;

  while (index < decompressedData.length) {
    // Find mode
    const modeEnd = decompressedData.indexOf(32, index); // Space ' ' delimiter
    const mode = decompressedData.slice(index, modeEnd).toString(); // Mode is a string

    // Find name
    const nameEnd = decompressedData.indexOf(0, modeEnd + 1); // Null byte '\0' delimiter
    const name = decompressedData.slice(modeEnd + 1, nameEnd).toString().trim(); // Trim whitespace

    entries.push(name);

    // Advance index past the entry (mode + name + null byte + 20-byte SHA1)
    index = nameEnd + 1 + 20; // Move past the SHA-1 hash
  }

  // Alphabetical sorting
  entries.sort();

  // Output each name
  entries.forEach((entry) => console.log(entry));
}


function createTreeObject(){

}


function writeTree() {
  const rootTreeSHA = writeTreeRecursive(process.cwd());
  console.log(rootTreeSHA);
}

function writeTree() {
  const rootTreeSHA = writeTreeRecursive(process.cwd());
  console.log(rootTreeSHA);
}
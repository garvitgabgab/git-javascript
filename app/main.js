const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");

// You can use print statements as follows for debugging, they'll be visible when running tests.
// console.log("Logs from your program will appear here!");

// Get command line arguments
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

  // Create directories for the hash
  const objectPath = path.join(process.cwd(), ".git", "objects", sha1Hash.slice(0, 2));
  if (!fs.existsSync(objectPath)) {
    fs.mkdirSync(objectPath);
  }

  // Write the zlib compressed object to disk
  const filePath = path.join(objectPath, sha1Hash.slice(2));
  const compressedData = zlib.deflateSync(store);
  fs.writeFileSync(filePath, compressedData);

  console.log(sha1Hash);
}

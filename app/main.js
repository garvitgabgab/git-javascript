const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// You can use print statements as follows for debugging, they'll be visible when running tests.
console.log("Logs from your program will appear here!");

// Uncomment this block to pass the first stage
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
  
  // Read the blob file in binary format
  const compressedData = fs.readFileSync(blobPath);

  // Decompress the blob object
  const decompressedData = zlib.inflateSync(compressedData);

  // Convert the decompressed data to a string
  const decompressedStr = decompressedData.toString('utf-8');

  // Extract the actual content by removing the header (e.g., "blob 11\0")
  const content = decompressedStr.slice(decompressedStr.indexOf('\0') + 1);

  // Print the content without an additional newline
  process.stdout.write(content);
}

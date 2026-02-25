const key = crypto.getRandomValues(new Uint8Array(32));
let binary = "";
for (let i = 0; i < key.length; i++) {
  binary += String.fromCharCode(key[i]);
}
console.log("ENCRYPTION_KEY=" + btoa(binary));

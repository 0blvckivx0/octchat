// OctID Generation and Management using Web Crypto API

export async function generateOctID() {
  try {
    // Generate Ed25519 keypair using Web Crypto API
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'Ed25519',
        namedCurve: 'Ed25519',
      },
      true, // extractable
      ['sign', 'verify']
    );

    // Export public key
    const publicKeyBuffer = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
    const publicKeyArray = new Uint8Array(publicKeyBuffer);
    const publicKeyBase64 = arrayBufferToBase64(publicKeyArray);

    // Hash public key with SHA-256 to create OctID
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', publicKeyArray);
    const hashArray = new Uint8Array(hashBuffer);
    const octID = 'oct' + arrayBufferToBase64(hashArray).substring(0, 42);

    // Export private key for storage
    const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyBase64 = arrayBufferToBase64(new Uint8Array(privateKeyBuffer));

    // Store in localStorage
    const identity = {
      octID,
      publicKey: publicKeyBase64,
      privateKey: privateKeyBase64,
      createdAt: new Date().toISOString()
    };

    localStorage.setItem('octchat_identity', JSON.stringify(identity));

    return identity;
  } catch (error) {
    console.error('Error generating OctID:', error);
    throw error;
  }
}

export function getStoredIdentity() {
  const stored = localStorage.getItem('octchat_identity');
  return stored ? JSON.parse(stored) : null;
}

export async function signMessage(message, privateKeyBase64) {
  try {
    // Import private key
    const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
    const privateKey = await window.crypto.subtle.importKey(
      'pkcs8',
      privateKeyBuffer,
      {
        name: 'Ed25519',
      },
      false,
      ['sign']
    );

    // Sign message
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);
    const signature = await window.crypto.subtle.sign(
      {
        name: 'Ed25519',
      },
      privateKey,
      messageBuffer
    );

    return arrayBufferToBase64(new Uint8Array(signature));
  } catch (error) {
    console.error('Error signing message:', error);
    throw error;
  }
}

export async function verifySignature(message, signatureBase64, publicKeyBase64) {
  try {
    // Import public key
    const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);
    const publicKey = await window.crypto.subtle.importKey(
      'raw',
      publicKeyBuffer,
      {
        name: 'Ed25519',
      },
      false,
      ['verify']
    );

    // Verify signature
    const encoder = new TextEncoder();
    const messageBuffer = encoder.encode(message);
    const signatureBuffer = base64ToArrayBuffer(signatureBase64);

    const isValid = await window.crypto.subtle.verify(
      {
        name: 'Ed25519',
      },
      publicKey,
      signatureBuffer,
      messageBuffer
    );

    return isValid;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

// Helper functions
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

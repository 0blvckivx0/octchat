import axios from 'axios';
import nacl from 'tweetnacl';

export class OctraClient {
  constructor(rpcUrl) {
    this.rpcUrl = rpcUrl;
    this.axiosInstance = axios.create({
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  /**
   * Verify a message signature using Ed25519
   */
  async verifyMessageSignature(message, signatureBase64, publicKeyBase64) {
    try {
      // Decode base64 inputs
      const signature = this.base64ToUint8Array(signatureBase64);
      const publicKey = this.base64ToUint8Array(publicKeyBase64);
      
      // Convert message to Uint8Array
      const messageBytes = new TextEncoder().encode(message);
      
      // Verify the signature using tweetnacl's Ed25519
      const isValid = nacl.sign.detached.verify(messageBytes, signature, publicKey);
      
      return isValid;
    } catch (error) {
      console.error('Error verifying signature:', error);
      return false;
    }
  }

  /**
   * Helper: Convert base64 to Uint8Array
   */
  base64ToUint8Array(base64) {
    const binaryString = Buffer.from(base64, 'base64');
    return new Uint8Array(binaryString);
  }

  /**
   * Helper: Convert Uint8Array to base64
   */
  uint8ArrayToBase64(uint8Array) {
    return Buffer.from(uint8Array).toString('base64');
  }

  /**
   * Create a private transfer on Octra blockchain
   * This would be used to send encrypted messages on-chain
   */
  async createPrivateTransfer(fromAddress, toAddress, encryptedMessage, privateKey) {
    try {
      const response = await this.axiosInstance.post(`${this.rpcUrl}/private_transfer`, {
        from: fromAddress,
        to: toAddress,
        amount: "0", // No actual token transfer, just using the encrypted data field
        from_private_key: privateKey,
        encrypted_data: encryptedMessage
      });

      return response.data;
    } catch (error) {
      console.error('Error creating private transfer:', error.message);
      throw error;
    }
  }

  /**
   * Get pending private transfers (messages) for an address
   */
  async getPendingTransfers(address, privateKey) {
    try {
      const response = await this.axiosInstance.get(
        `${this.rpcUrl}/pending_private_transfers`,
        {
          params: { address },
          headers: { 'X-Private-Key': privateKey }
        }
      );

      return response.data.pending_transfers || [];
    } catch (error) {
      console.error('Error getting pending transfers:', error.message);
      return [];
    }
  }

  /**
   * Claim a private transfer (receive a message)
   */
  async claimPrivateTransfer(recipientAddress, privateKey, transferId) {
    try {
      const response = await this.axiosInstance.post(`${this.rpcUrl}/claim_private_transfer`, {
        recipient_address: recipientAddress,
        private_key: privateKey,
        transfer_id: transferId
      });

      return response.data;
    } catch (error) {
      console.error('Error claiming private transfer:', error.message);
      throw error;
    }
  }

  /**
   * Check if Octra RPC is available
   */
  async healthCheck() {
    try {
      const response = await this.axiosInstance.get(`${this.rpcUrl}/health`, {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      return false;
    }
  }
}

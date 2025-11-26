export class AudioRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private sampleRate = 16000;
  private audioChunks: Blob[] = [];

  async startRecording(
    onAudioData: (data: ArrayBuffer) => void
  ): Promise<void> {
    try {
      // Get user media
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      // Create audio context for processing
      this.audioContext = new AudioContext({ sampleRate: this.sampleRate });
      const source = this.audioContext.createMediaStreamSource(this.stream);
      const processor = this.audioContext.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcm16 = this.convertFloat32ToPCM16(inputData);
        // console.log(`Audio: Processed ${pcm16.length} samples`);
        onAudioData(pcm16.buffer as ArrayBuffer);
      };

      source.connect(processor);
      processor.connect(this.audioContext.destination);

      // Use MediaRecorder to save complete audio for post-processing
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: 'audio/webm',
      });

      // Reset audio chunks when starting new recording
      this.audioChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
        }
      };

      this.mediaRecorder.start(100); // Collect data every 100ms
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }

  stopRecording(): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.onstop = () => {
          const audioBlob = this.audioChunks.length > 0 
            ? new Blob(this.audioChunks, { type: 'audio/webm' })
            : null;
          this.mediaRecorder = null;
          this.audioChunks = [];
          resolve(audioBlob);
        };
        this.mediaRecorder.stop();
      } else {
        resolve(null);
      }

      if (this.stream) {
        this.stream.getTracks().forEach((track) => track.stop());
        this.stream = null;
      }

      if (this.audioContext) {
        this.audioContext.close();
        this.audioContext = null;
      }
    });
  }

  /**
   * Get the recorded audio blob (call after stopRecording)
   */
  getAudioBlob(): Blob | null {
    return this.audioChunks.length > 0 
      ? new Blob(this.audioChunks, { type: 'audio/webm' })
      : null;
  }

  private convertFloat32ToPCM16(float32Array: Float32Array): Int16Array {
    const int16Array = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return int16Array;
  }
}


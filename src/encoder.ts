import MP4Box from "mp4box";

type Options = {
  framerate: number;
  videoBitrate: number;
  canvas: HTMLCanvasElement;
  duration: number;
};

const SECOND_IN_MICROSECOND = 1_000_000;

export class Encoder {
  private framerate: number;
  private videoBitrate: number;
  private keyframeIntervalInSecs = 2;
  private canvas: HTMLCanvasElement;
  private videoEncoder: VideoEncoder;
  private mp4: MP4Box.MP4File;
  private encodingVideoTrackId: number | null = null;
  private videoTrackOptions: MP4Box.TrackOptions;
  private videoSampleOptions: MP4Box.SampleOptions;
  private currentFrame = 0;
  private encodedVideoFrameCount = 0;
  private microsecondsPerFrame: number;

  constructor({ framerate, videoBitrate, canvas, duration }: Options) {
    this.framerate = framerate;
    this.videoBitrate = videoBitrate;
    this.microsecondsPerFrame = SECOND_IN_MICROSECOND / this.framerate;
    this.canvas = canvas;
    this.mp4 = MP4Box.createFile();
    this.videoEncoder = new VideoEncoder({
      output: this.handleEncodedVideoChunk.bind(this),
      error: (err) => {
        throw err;
      },
    });
    this.videoTrackOptions = {
      duration: SECOND_IN_MICROSECOND * duration,
      timescale: SECOND_IN_MICROSECOND,
      media_duration: duration * SECOND_IN_MICROSECOND,
    };
    this.videoSampleOptions = {
      duration: SECOND_IN_MICROSECOND / this.framerate,
      dts: 0,
      cts: 0,
      is_sync: false,
    };
  }

  private async handleEncodedVideoChunk(
    chunk: EncodedVideoChunk,
    metadata: EncodedVideoChunkMetadata
  ) {
    if (this.encodingVideoTrackId === null) {
      this.videoTrackOptions.avcDecoderConfigRecord =
        metadata.decoderConfig?.description;
      this.encodingVideoTrackId = this.mp4.addTrack(this.videoTrackOptions);
    }

    const buffer = new ArrayBuffer(chunk.byteLength);
    chunk.copyTo(buffer);

    this.videoSampleOptions.dts =
      this.encodedVideoFrameCount * this.microsecondsPerFrame;
    this.videoSampleOptions.cts =
      this.encodedVideoFrameCount * this.microsecondsPerFrame;
    this.videoSampleOptions.is_sync = chunk.type === "key";

    this.mp4.addSample(
      this.encodingVideoTrackId,
      buffer,
      this.videoSampleOptions
    );

    this.encodedVideoFrameCount++;
  }

  async prepare() {
    this.videoTrackOptions.width = this.canvas.width;
    this.videoTrackOptions.height = this.canvas.height;
    const config: VideoEncoderConfig = {
      codec: "avc1.42001F",
      width: this.canvas.width,
      height: this.canvas.height,
      displayWidth: this.canvas.width,
      displayHeight: this.canvas.height,
      bitrate: this.videoBitrate,
      framerate: this.framerate,
    };
    const configResult = await VideoEncoder.isConfigSupported(config);
    if (configResult.supported) {
      this.videoEncoder.configure(config);
    } else {
      throw new Error("Video config not supported.");
    }
  }

  async stop() {
    await this.videoEncoder.flush();
    this.videoEncoder.close();
    this.mp4.save(`captured-${Math.floor(Date.now() / 1000)}.mp4`);
  }

  async addFrame() {
    const frame = new VideoFrame(this.canvas, {
      timestamp: this.microsecondsPerFrame * this.currentFrame,
      duration: this.microsecondsPerFrame,
    });
    this.videoEncoder.encode(frame, {
      keyFrame:
        this.currentFrame % (this.framerate * this.keyframeIntervalInSecs) ===
        0,
    });
    frame.close();
    this.currentFrame++;

    if (
      this.currentFrame >=
      (this.videoTrackOptions.duration! / SECOND_IN_MICROSECOND) *
        this.framerate
    ) {
      await this.stop();
      return true;
    }

    return false;
  }
}

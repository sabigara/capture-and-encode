// @ts-ignore
import WebMWriter from "./webm-writer";

type Options = {
  framerate: number;
  videoBitrate: number;
  canvas: HTMLCanvasElement;
  duration: number;
};

const SECOND_IN_MICROSECOND = 1000000;

export class Encoder {
  private framerate: number;
  private videoBitrate: number;
  private keyframeIntervalInSecs = 4;
  private canvas: HTMLCanvasElement;
  private videoEncoder: VideoEncoder;
  private microsecondsPerFrame: number;
  private webm: typeof WebMWriter;
  private duration: number;
  private currentFrame = 0;

  constructor({ framerate, videoBitrate, canvas, duration }: Options) {
    this.framerate = framerate;
    this.videoBitrate = videoBitrate;
    this.microsecondsPerFrame = SECOND_IN_MICROSECOND / this.framerate;
    this.canvas = canvas;
    this.duration = duration;
    this.videoEncoder = new VideoEncoder({
      output: this.handleEncodedVideoChunk.bind(this),
      error: (err) => {
        throw err;
      },
    });

    this.webm = new WebMWriter({
      fileWriter: null,
      codec: "VP8",
      width: this.canvas.width,
      height: this.canvas.height,
      frameRate: this.framerate,
    });
  }

  private handleEncodedVideoChunk(chunk: EncodedVideoChunk) {
    this.webm.addChunk(chunk);
  }

  start() {
    // noop
  }

  async prepare() {
    const config: VideoEncoderConfig = {
      codec: "vp8",
      width: this.canvas.width,
      height: this.canvas.height,
      bitrate: this.videoBitrate,
      framerate: this.framerate,
      bitrateMode: "constant",
    };
    const configResult = await VideoEncoder.isConfigSupported(config);
    if (configResult.supported) {
      this.videoEncoder.configure(config);
    } else {
      throw new Error("Video config not supported.");
    }
  }

  async complete() {
    await this.videoEncoder.flush();
    this.videoEncoder.close();
    const blob = await this.webm.complete();
    this.download(blob);
  }

  private download(blob: Blob) {
    const anchor = document.createElement("a");
    anchor.download = `captured-${Math.floor(Date.now() / 1000)}.webm`;
    anchor.href = URL.createObjectURL(blob);
    anchor.click();
  }

  dispose() {
    if (this.videoEncoder.state !== "closed") {
      this.videoEncoder.close();
    }
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

    if (this.currentFrame >= this.duration * this.framerate) {
      await this.complete();
      return true;
    }

    return false;
  }
}

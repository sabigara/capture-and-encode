declare module "mp4box" {
  export interface MP4MediaTrack {
    id: number;
    created: Date;
    modified: Date;
    movie_duration: number;
    layer: number;
    alternate_group: number;
    volume: number;
    track_width: number;
    track_height: number;
    timescale: number;
    duration: number;
    bitrate: number;
    codec: string;
    language: string;
    nb_samples: number;
  }

  interface MP4VideoData {
    width: number;
    height: number;
  }

  export interface MP4VideoTrack extends MP4MediaTrack {
    video: MP4VideoData;
  }

  export interface MP4AudioData {
    sample_rate: number;
    channel_count: number;
    sample_size: number;
  }

  interface MP4AudioTrack extends MP4MediaTrack {
    audio: MP4AudioData;
  }

  type MP4Track = MP4VideoTrack | MP4AudioTrack;

  export interface MP4Info {
    duration: number;
    timescale: number;
    fragment_duration: number;
    isFragmented: boolean;
    isProgressive: boolean;
    hasIOD: boolean;
    brands: string[];
    created: Date;
    modified: Date;
    tracks: MP4Track[];
    videoTracks: MP4VideoTrack[];
  }

  export type MP4ArrayBuffer = ArrayBuffer & { fileStart?: number };

  export interface MP4File {
    onMoovStart?: () => void;
    onReady?: (info: MP4Info) => void;
    onError?: (e: string) => void;

    appendBuffer(data: MP4ArrayBuffer): number;
    start(): void;
    stop(): void;
    flush(): void;
    save(filename: string): void;
    addTrack(options?: TrackOptions): number;
    addSample(
      trackId: number,
      sample: ArrayBuffer,
      options?: SampleOptions
    ): void;
    [key: string]: any;
  }

  export type TrackOptions = {
    timescale?: number;
    width?: number;
    height?: number;
    nb_samples?: number;
    media_duration?: number;
    brands?: string[];
    avcDecoderConfigRecord?: any;
    id?: number;
    type?: string;
    duration?: number;
    layer?: number;
    language?: string;
    hdlr?: string;
    name?: string;
    samplesize?: number;
    samplerate?: number;
    channel_count?: number;
    namespace?: string;
    schema_location?: string;
    auxiliary_mime_type?: string;
    description?: string;
    description_boxes?: string[];
    default_sample_description_index?: number;
    default_sample_duration?: number;
    default_sample_size?: number;
    default_sample_flags?: number;
  };

  export type SampleOptions = {
    duration?: number;
    cts?: number;
    dts?: number;
    is_sync?: boolean;
    depends_on?: number;
    is_depended_on?: number;
    has_redundancy?: number;
  };

  export function createFile(): MP4File;

  export {};
}

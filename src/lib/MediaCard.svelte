<script lang="ts">
  import { getTimeEmoji, sanitizeFilename } from "./Constants.svelte";
  import Speakers from "./Speakers.svelte";
  import { createEventDispatcher } from "svelte";

  const dispatch = createEventDispatcher();

  export let media: any;
  export let currentMedia: any = null;
  export let downloadable: boolean = false;
  export let showTime: boolean = true;

  const onClickMedia = (media: any) => {
    currentMedia = media;
    dispatch("onClickMedia", media);
  };

  const onDownload = (title: string, url: string) => {
    const anchor = document.createElement("a");
    anchor.href = url;

    const urlSplit = url.split("?")[0].split(".");
    const fileExtension = "." + urlSplit[urlSplit.length - 1];
    anchor.download = sanitizeFilename(title) + fileExtension;

    anchor.target = "_blank";

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  };

  $: selected = media == currentMedia;
</script>

<div
  title={media.title}
  class="media-item"
  class:selected
  aria-current={selected ? "true" : undefined}
  on:click={() => onClickMedia(media)}
  on:keydown={(e) => (e.key === "Enter" || e.key === " ") && e.target === e.currentTarget && (e.preventDefault(), onClickMedia(media))}
  tabindex="0"
  role="button"
>
  <div class="thumbnail-container">
    <img class="thumbnail" src={media.thumbnail} alt="" loading="lazy" decoding="async" />
    {#if selected}
      <span class="playing-badge">▶ Lecture</span>
    {/if}
  </div>
  <div class="video-details">
    {#if media.sessionTitle}
      <div class="media-title media-session-title" style="color: {media.sessionTypeColor}">{media.sessionTitle}</div>
    {/if}
    <div class="media-title"><strong>{media.title}</strong></div>
    <div class="subtitle">
      {#if showTime}
        <span>{getTimeEmoji(media.start)} {media.start}</span>
      {/if}
      {#if downloadable}
        <button
          type="button"
          title="Télécharger la vidéo"
          class="btn-download"
          on:click|stopPropagation={() => onDownload(media.title, media.hdUrl ?? media.url)}
          on:keydown|stopPropagation
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M11 5C11 4.44772 11.4477 4 12 4C12.5523 4 13 4.44772 13 5V12.1578L16.2428 8.91501L17.657 10.3292L12.0001 15.9861L6.34326 10.3292L7.75748 8.91501L11 12.1575V5Z"
              fill="currentColor"
            />
            <path d="M4 14H6V18H18V14H20V18C20 19.1046 19.1046 20 18 20H6C4.89543 20 4 19.1046 4 18V14Z" fill="currentColor" />
          </svg>
          <span>Télécharger</span>
        </button>
      {/if}
    </div>
    {#if media.speakers}
      <Speakers speakers={media.speakers} optimizeSpace={true} />
    {/if}
  </div>
</div>

<style>
  .media-item {
    display: flex;
    gap: 12px;
    padding: 8px;
    border-radius: var(--radius-sm);
    border-left: 3px solid transparent;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .media-item:hover {
    background-color: var(--surface-hover);
  }

  .media-item.selected {
    background-color: var(--surface-hover);
    border-left-color: var(--highlight);
  }

  .media-title {
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    display: -webkit-box;
    font-size: 0.9rem;
    line-height: 1.25;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .media-session-title {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
  }

  .video-details {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .thumbnail-container {
    position: relative;
    flex: 0 0 132px;
    align-self: flex-start;
    aspect-ratio: 16 / 9;
    border-radius: 4px;
    overflow: hidden;
    background-color: var(--surface-sunken);
  }

  .thumbnail {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .playing-badge {
    position: absolute;
    left: 4px;
    bottom: 4px;
    padding: 1px 6px;
    border-radius: 4px;
    background-color: var(--highlight);
    color: var(--on-highlight);
    font-size: 0.7rem;
    font-weight: 700;
  }

  .subtitle {
    flex-wrap: wrap;
    gap: 8px;
  }

  .btn-download {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    min-height: 28px;
    padding: 0 8px;
    border-radius: 50px;
    border: 1px solid var(--border);
    background-color: transparent;
    color: var(--text-muted);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
  }

  .btn-download:hover {
    color: #fff;
    background-color: var(--accent);
    border-color: var(--accent);
  }

  @media (max-width: 1000px) {
    .thumbnail-container {
      flex-basis: 112px;
    }
  }
</style>

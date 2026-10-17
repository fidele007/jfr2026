<script lang="ts">
  import { base } from "$app/paths";
  import { getFriendlyDate, getTimeEmoji } from "./Constants.svelte";

  export let info: any;

  const membersOf = (roleName: string) =>
    info.outerRoles
      ?.find((role: any) => role.name === roleName)
      ?.members.items.map((item: any) => `${item.firstName} ${item.lastName}`)
      .join(", ");

  $: responsables = membersOf("responsable");
  $: moderators = membersOf("modérateur");
  $: speakers = membersOf("speaker");
  $: organizers = info.organizers?.map((item: any) => item.name).join(", ");
  $: tags = info.tracks?.map((track: any) => track.label) as string[] | undefined;

  $: startTime = info.start.split("T")[1].split("+")[0];
  $: endTime = info.end.split("T")[1].split("+")[0];
  $: typeColor = info.sessionTypeColor !== "#000000" ? info.sessionTypeColor : "var(--text-muted)";
</script>

<a class="card" href="{base}/session?id={info.id}" style="--type-color: {typeColor}">
  <div class="card-info">
    <div class="card-type">{info.sessionType}</div>
    <h2 class="card-title">{info.title}</h2>
    <div class="date-time subtitle">
      <span>🗓️ {getFriendlyDate(info.start.split("T")[0])}</span>
      <span>{getTimeEmoji(startTime)} {startTime} – {endTime}</span>
    </div>
    <dl class="participants">
      {#if responsables}
        <div><dt>Responsable</dt><dd>{responsables}</dd></div>
      {/if}
      {#if moderators}
        <div><dt>Modérateur</dt><dd>{moderators}</dd></div>
      {/if}
      {#if speakers}
        <div><dt>Orateurs</dt><dd>{speakers}</dd></div>
      {/if}
      {#if organizers}
        <div><dt>Organisateur</dt><dd>{organizers}</dd></div>
      {/if}
    </dl>
    {#if tags && tags.length > 0}
      <div class="tag-list">
        {#each tags as tag}
          <span class="tag-name">{tag}</span>
        {/each}
      </div>
    {/if}
  </div>
  {#if info.picture}
    <div class="thumbnail-container">
      <img src={info.picture} alt="" class="thumbnail" loading="lazy" decoding="async" />
      <span class="play-badge" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg>
      </span>
      <span class="visually-hidden">Vidéos disponibles</span>
    </div>
  {/if}
</a>

<style>
  .card {
    display: flex;
    gap: 16px;
    padding: 14px 16px 14px 18px;
    border-radius: var(--radius);
    border: 1px solid var(--border);
    border-left: 5px solid var(--type-color);
    background-color: var(--surface);
    box-shadow: var(--shadow);
    color: inherit;
    font-weight: normal;
    text-align: left;
    transition:
      background-color 0.15s ease,
      border-color 0.15s ease,
      transform 0.15s ease;
  }

  .card:hover {
    background-color: var(--surface-hover);
    border-color: var(--text-muted);
    border-left-color: var(--type-color);
    transform: translateY(-1px);
  }

  .card-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  .card-type {
    color: var(--type-color);
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .card-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 700;
    line-height: 1.3;
  }

  .card:hover .card-title {
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 3px;
  }

  .participants {
    display: flex;
    flex-direction: column;
    gap: 1px;
    margin: 4px 0 0;
    font-size: 0.875rem;
  }

  .participants div {
    display: flex;
    flex-wrap: wrap;
    column-gap: 6px;
    align-items: baseline;
  }

  .participants dt {
    color: var(--text-muted);
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .participants dd {
    margin: 0;
    font-weight: 600;
  }

  .tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 6px;
  }

  .tag-name {
    background-color: rgb(35 184 42 / 12%);
    border-radius: 50px;
    color: var(--text-muted);
    font-size: 0.75rem;
    font-weight: 600;
    padding: 2px 10px;
  }

  .thumbnail-container {
    position: relative;
    flex: 0 0 auto;
    align-self: center;
    width: 280px;
    aspect-ratio: 16 / 9;
    border-radius: var(--radius-sm);
    overflow: hidden;
    background-color: var(--surface-sunken);
    border: 1px solid var(--border);
  }

  .thumbnail {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .play-badge {
    position: absolute;
    right: 6px;
    bottom: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background-color: rgb(0 0 0 / 65%);
    color: #fff;
  }

  @media (max-width: 900px) {
    .thumbnail-container {
      width: 200px;
    }
  }

  @media (max-width: 600px) {
    .card {
      flex-direction: column-reverse;
      gap: 10px;
      padding: 12px 12px 12px 14px;
    }

    .thumbnail-container {
      width: 100%;
      align-self: stretch;
    }

    .card-title {
      font-size: 1rem;
    }
  }
</style>

# VibeOGram: Issues and implementation gaps

App source paths below refer to `audio-social-app`; product documentation paths refer to this backend repository.

## Major product issues

| ID | Area | Issue | Code / evidence |
|---|---|---|---|
| M1 | Onboarding | **Create Account** on the welcome entry screen opens Login instead of Signup. Two consecutive guarded calls drop the signup navigation. | `src/features/onboarding/screens/auth-entry-screen.tsx:52-55` |
| M2 | Artist profiles | Back from a newly opened artist profile can return to a previously viewed artist profile instead of the screen it was opened from. | Hidden Artist tab history in `src/shared/navigation/app-tabs.tsx:16,47-53`; `src/features/home/screens/home-screen.tsx:254-260` |
| M3 | Explore | **Follow** on the Rising Creator card opens the artist profile instead of following the artist. | `src/features/explore/screens/explore-screen.tsx:240-242` |
| M4 | Home contest card | **Enter Contest** has no action, despite the card appearing active. | `src/features/home/screens/home-screen.tsx:347`; no `onPrimaryPress` supplied |
| M5 | Home contest card | **Listen Entries** has no action. | `src/features/home/screens/home-screen.tsx:347`; no `onSecondaryPress` supplied |
| M6 | Explore contest card | **Join & Download Stems** has no action, despite the card appearing active. | `src/features/explore/screens/explore-screen.tsx:281-290`; no `onPrimaryPress` supplied |
| M7 | Explore / player | After a short song finishes, pressing Play again can leave the player silent while the mini-player displays Pause. | Explore hero to Test audio; player end/restart path in `src/features/player/store/player.store.ts` and `src/features/player/services/listen-audio-controller.ts` |

## Minor product issues

| ID | Area | Issue | Code / evidence |
|---|---|---|---|
| N1 | Music-taste onboarding | The visible **Skip** label is unreliable to tap; tapping just to its right works. The touch target has no 48dp minimum. | `src/features/onboarding/screens/genre-picker-screen.tsx:76-80` |
| N2 | Auth entry / signup | Underlined **Terms of Service** text is not clickable. | `src/features/onboarding/screens/auth-entry-screen.tsx:122-126`; `src/features/auth/screens/signup-screen-three.tsx:216-225` |
| N3 | Auth entry / signup | Underlined **Privacy Policy** text is not clickable. | Same files as N2 |
| N4 | Signup | An already-taken username is reported only after submitting the password step; the error appears beneath Confirm Password rather than next to Username. | `src/features/auth/screens/signup-screen-two.tsx`; `src/features/auth/screens/signup-screen-three.tsx:70-90,199-201` |
| N5 | Home Trending | Song-row three-dot menu is visible but does nothing. | `src/shared/components/music/trending-track-row.tsx:82-89`; Home supplies no `onMorePress` |
| N6 | Explore Top Songs | Song-row three-dot menu is visible but does nothing. | Same shared row; `src/features/explore/screens/explore-screen.tsx:292-303` supplies no `onMorePress` |
| N7 | Explore contest card | Share icon has no action. | `src/features/explore/screens/explore-screen.tsx:281-290`; no `onSecondaryPress` supplied |
| N8 | Public artist profile | No visible Back control on another artist's profile. | `src/app/(tabs)/artist/_layout.tsx:4`; `src/features/profile/components/profile-screen-shell.tsx` |
| N9 | Own profile | Repeated Share taps open repeated OS share flows without a duplicate-invocation guard. | `src/features/profile/components/profile-hero.tsx:48-52,106-120` |

## Polish issues

| ID | Area | Issue |
|---|---|---|
| P1 | Signup name step | Form is top-heavy with excessive blank space above the keyboard. |
| P2 | Signup steps 1-3 | Headings, descriptions, username guidance, password guidance and consent copy need clearer, more consistent wording. |
| P3 | Home | “Fresh ears for a new session” greeting feels awkward/generic. |
| P4 | Home Featured Artists | Artists without photos display empty dark circles rather than an intentional initials/default-avatar state. `src/shared/components/music/featured-artists-section.tsx:30-38` always renders an image, including an empty URL. |
| P5 | Own profile | Settings and notification icons sit too high near the status bar. |
| P6 | Edit Profile | Large unused area below the form and above the bottom player/tabs makes the layout feel unbalanced. |
| P7 | Own profile | **Share profile** is duplicated in the cover action and the three-dot sheet. |

## Additional code and wiring issues

These entries identify source-level defects or gaps; the reported runtime effect should be confirmed where noted.

| ID | Severity | Area | Issue / required work | Source |
|---|---|---|---|---|
| C1 | Major | Profile/player | “No featured song yet” is a synthetic, unplayable item but retains an enabled Play button and can enter the global mini-player as Unavailable. Disable the action for this empty state. | `src/features/profile/utils/map-catalog-to-profile.ts:28-45`; `src/features/profile/components/profile-screen-shell.tsx:78-94` |
| C2 | Major | Play counting | A seek past 30s (or 50% of a short track) can count as a meaningful play because the gate uses playhead position rather than listening time. | `src/features/player/store/player.store.ts:133-154,400-408,426-442`; backend `docs/features/global-player.md` |
| C3 | Major | Feed/global audio | Feed autoplay does not account for an already-playing global player; returning to Feed can start both sources. Verify and enforce audio isolation. | `src/features/feed/screens/feed-screen.tsx:60-85`; `src/features/feed/hooks/use-feed-preview-playback.ts:85-104` |
| C4 | Major | Notifications | Opening a track notification calls the owner-only track endpoint for another artist's song and falls back to the artist profile. Use the public-track detail endpoint. | `src/features/notifications/screens/notifications-screen.tsx:76-99`; `src/features/tracks/api/service.ts:55-66` |
| C5 | Major | Profile sharing | **Copy profile link** builds `/artist/{username}`, while the route/API expects a user UUID. Profile Share actions send text without a usable link. | `src/features/profile/components/profile-options-sheet.tsx:34-45`; `src/features/profile/hooks/use-public-profile.ts:48-57` |
| C6 | Major | Feed Clip trimmer | Tracks shorter than 10s are artificially treated as 10s, allowing a trim window past the end of the real mix. Reject an ineligible short track rather than creating an invalid selection. | `src/features/feed/screens/create-feed-clip-screen.tsx:100-110,185-203` |
| C8 | Minor | Feed social actions | Optimistic clip Like and Follow state has no rollback or error feedback when a request fails. | `src/features/feed/components/feed-vibe-page.tsx:183-229` |
| C9 | Minor | Signup | The existing username-availability API/hook is used in Edit Profile but not on signup's username step. | `src/features/auth/screens/signup-screen-two.tsx`; `src/features/profile/api/hooks.ts:61` |
| C10 | Minor | Notifications/settings | Notification preference switches are device-local with no push-delivery wiring; the inbox profile initial is hardcoded “U.” | `src/features/notifications/screens/notifications-screen.tsx:103-129`; `src/features/settings/screens/notification-prefs-screen.tsx:10-35` |
| C11 | Minor | Feed Clip trimmer | Drag handles use a 28px hit width, below a 48dp Android touch target. | `src/features/feed/components/feed-clip-trimmer.tsx:8,269-290` |
| C12 | Major | Build/type safety | TypeScript errors: unsupported `borderCurve` in a Feed image style and an unavailable `Router` type import in the Studio leave utility. | `src/features/feed/components/feed-vibe-page.tsx:125-132`; `src/features/studio/utils/leave-studio-session.ts:1-8` |
| C13 | Major | Lint/source quality | Lint errors include Feed/Studio hook/ref patterns, synchronous effect state changes and duplicate exports in `src/features/users/index.ts`. | `src/features/feed/components/feed-clip-trimmer.tsx`; `src/features/feed/hooks/use-feed-preview-playback.ts`; `src/features/users/index.ts` |

## Unimplemented or incomplete product areas

| Area | Missing / incomplete work | Product reference |
|---|---|---|
| Contests | Live contest data, entry, votes, leaderboard, eligible tracks, winner confirmation and prize flow are planned. Home/Explore currently display fixture cards with inactive CTAs. | `docs/features/contests.md` and `docs/features/explore.md` |
| Admin, Admin panel and Coins/Wallet | Admin foundation, admin panel UI, wallet/ledger, grants and mobile wallet screens are planned dependencies for Contests. | `docs/features/admin.md`, `docs/features/admin-panel.md`, `docs/features/coins-and-wallet.md` |
| Notifications push | In-app inbox exists; push delivery is not wired. Preferences remain local to the device. | `docs/features/notifications.md`; app `src/features/settings/screens/notification-prefs-screen.tsx` |
| Global player | Player shell/queue/repeat/comments code exists; M7 and C2 remain, along with unverified 30s/50% count, repeat behavior and full-screen/mini handoff. | `docs/features/global-player.md` |
| Feed and Feed Clip | API/UI exists, but clip-create/upload, 3-loop Replay, shared comments, like isolation, full-track handoff and library edit/remove still require end-to-end verification; C3/C6/C8/C11 remain. | `docs/features/feed.md` |
| Studio and import | Recording/import routes exist; Studio reliability and supported import formats/limits are still open. | `docs/project-context.md`, `docs/implementation-roadmap.md` |
| Deferred features | Tanpura, subscriptions and payments are deferred rather than missing from the current release scope. | `docs/project-context.md` |

## Pending verification and unresolved questions

These items are not confirmed defects. They remain open before the corresponding feature can be considered verified.

| Area | Pending checks / unresolved details |
|---|---|
| Auth and account | Wrong-password error, password-reset flow, signup validation beyond the username conflict, and legal-link destinations after wiring. |
| Home | Audible playback from Home track rows, refresh request/data changes, artist/profile Back behavior after a navigation fix, and all remaining cards/icons in the dead-control sweep. |
| Explore | Published-only visibility (draft/unpublished exclusion), full-list/playlist navigation, hero carousel state, replay after EOF (M7) and sound from other playable entries. |
| Search | Known-song and known-artist results; music/artist result destinations; recent history creation/removal/clear; empty and gibberish queries; fast typing and keyboard behavior. |
| Global player / mini-player | Mini to Now Playing handoff, play/pause/close, scrubber, queue progression, repeat **OFF to REPEAT_ALL to REPEAT_ONE to OFF**, stop/wrap/loop behavior, lock-screen metadata and no double audio. Confirm M7 and C2 with actual playback. |
| Play accounting | One count after 30s of actual listening for tracks at least 30s or after 50% for shorter tracks; no immediate count on tap, seek or pause-before-threshold; no duplicate count without a new listening session. |
| Song social actions | Player heart and Liked Songs consistency; in-line track comments, posting/replying, empty/double submit and keyboard access. |
| Library and collections | Projects/Drafts/Published/Liked/Playlists/Albums filters, published-row destination, Liked Songs playback, playlist/album queue, menus, unavailable entries and rapid section switching. |
| Own/public profile and Settings | Edit/save name and profile media, username cooldown/availability, public follow/unfollow, stats destinations, copied link opening, settings rows, cache and notifications inbox behavior. |
| Create / Studio | Create-menu routes, record/import/timeline opening, studio exit and draft state, backup/restore reliability, and whether a SYNCED draft with required cover/mix exists for publishing. |
| Publish | SYNCED/cover/genre gate; publish success; **Create Feed Clip / Not now** prompt; published track appearing in public discovery/profile; unpublish behavior. Availability of a publishable draft is unknown. |
| Feed Clip creation | Trimmer opening without native crash, 10-30s min/max handles, preview loop, short-track ineligibility (C6), upload, success state and duplicate-confirm protection. |
| Feed consumption | Dedicated autoplay isolated from global mini, vertical swipe pause/play, three loops then Replay, clip-only heart without adding full song to Liked Songs, follow state, empty/error/retry state. Availability of a live clip is unknown. |
| Feed comments and handoff | Half-sheet on the parent track's comments, posting/keyboard/dismissal, **Open Full Track** with full mix, no simultaneous clip/global audio, and correct Back state. |
| Feed Clip management | Library Create/Edit/Remove clip actions, one clip per published song, and removal that leaves the full song published. |
| Navigation and dead UI | Deep Back paths, rapid main-tab changes with mini-player visible, modal dismissal, and every visible CTA/icon across Home, Explore, Feed, Library, Profile, Now Playing and Publish. |

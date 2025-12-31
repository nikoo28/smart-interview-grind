# 📅 Maintenance Schedule & Guide

This guide describes how to maintain the project according to your weekly, bi-weekly, and monthly schedule.

---

## 1. Weekly: Update YouTube Videos 📺
**Goal:** Sync new video solutions from your YouTube channel to the app.

1.  **Run the update script:**
    ```bash
    node scripts/fetch_youtube_videos.js
    ```
    *Result:* `src/data/problems.json` will be updated with new `videoUrl` and `videoThumbnail` links for any matching problems.

    > **Video Title Formats:**
    > The script automatically detects problem IDs in your YouTube titles.
    > *   **Single:** `"Two Sum (LeetCode 1)"` or `"LeetCode #1"`
    > *   **Multiple:** `"LeetCode 125, 3, 63"` (Comma separated list)
    > *   **Mixed:** `"LeetCode 125 & LeetCode #9"`

2.  **🔒 Encrypt Data (IMPORTANT):**
    *   **You MUST run this to secure the data before deploying.**
    ```bash
    npm run encrypt
    ```
    *Result:* Creates `public/problems.lock` (The encrypted lockbox).

3.  **Deploy:**
    ```bash
    npm run deploy
    ```

---

## 2. Bi-Weekly: Update Problem Data (XLSX) 📊
**Goal:** Refresh the problem database with your scraped Excel sheet (Difficulty, Topics, Stats).

1.  **Prepare the File:**
    *   Name your file: `leetcode_problems_YYYYMMDD.xlsx` (or any name starting with `leetcode_problems_`).
    *   **Delete** the old `.xlsx` file from the `admin/` folder.
    *   **Paste** your NEW file into the `admin/` folder.

2.  **Update Database:**
    ```bash
    npm run update-data
    ```
    *Result:* This reads the new Excel file and regenerates `src/data/problems.json`.

3.  **Sync Videos Again:**
    *   Since `update-data` regenerates the JSON from scratch, it might wipe video links. **Always run the video script after updating data.**
    ```bash
    node scripts/fetch_youtube_videos.js
    ```

4.  **🔒 Encrypt Data:**
    ```bash
    npm run encrypt
    ```

5.  **Deploy:**
    ```bash
    npm run deploy
    ```

---

## 3. Monthly: Update Company Tags (CSV) 🏢
**Goal:** Update the mapping of which companies ask which problems.

1.  **Prepare the File:**
    *   Name your file: `global_problem_company_mapping.csv`.
    *   **Replace** the existing file in `admin/` with your new one.

2.  **Update Database:**
    ```bash
    npm run update-data
    ```

3.  **Sync Videos:**
    ```bash
    node scripts/fetch_youtube_videos.js
    ```

4.  **Encrypt Data:**
    ```bash
    npm run encrypt
    ```

5.  **Deploy:**
    ```bash
    npm run deploy
    ```

---

## 💡 Quick Reference Commands

| Action | Command |
| :--- | :--- |
| **Start Local Server** | `npm run dev` |
| **Update DB (Excel/CSV)** | `npm run update-data` |
| **Fetch Videos** | `node scripts/fetch_youtube_videos.js` |
| **🔒 Encrypt Data** | `npm run encrypt` |
| **Run Tests** | `npm run test` |
| **Deploy App** | `npm run deploy` |

---

## ℹ️ Admin Folder Contents

*   **`admin/youtube_config.js`**: (Git-ignored) Contains your YouTube API Key. Do not share.
*   **`admin/secret.key`**: (Git-ignored) **The Master Key**. If lost, no one can open new data updates. Backup this file!
*   **`admin/smart-interview.license`**: A generatable license key for distribution.
*   **`admin/leetcode_problems_*.xlsx`**: Your source of truth for problem data.
*   **`admin/global_problem_company_mapping.csv`**: Your source of truth for company tags.

---
*Created by Antigravity Agent - Dec 2025*

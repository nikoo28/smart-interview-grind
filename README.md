# Interview Grind - Intelligent Prep Scheduler

This application generates a tailored interview preparation schedule based on your time constraints, target companies, and experience level.

## 🚀 Quick Start

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Start the App**:
    ```bash
    npm run dev
    ```

## 🔄 How to Update Data

To update the application with new problems or company tags, you need two source files in the root directory:

1.  **Company Mapping CSV**: Must be named exactly `global_problem_company_mapping.csv`.
2.  **LeetCode Excel Export**: Must start with `leetcode_problems_` and end with `.xlsx` (e.g., `leetcode_problems_20251223.xlsx`).

### Update Steps:

1.  Place the new files in the root folder (overwriting old ones if necessary).
2.  Run the update script:
    ```bash
    npm run update-data
    ```
3.  Restart the dev server to see changes (if running):
    ```bash
    npm run dev
    ```

The script will automatically find the latest Excel file and merge it with the CSV to regenerate `src/data/problems.json`.

## 🛠 Configuration

- **Difficulty**: Filters problems by 5 levels (Very Easy -> Very Hard).
- **Companies**: Filters by target company (Google, Amazon, etc.).
- **Topics**: Filters by topic (Dynamic Programming, Graphs, etc.).
- **Experience Level**:
    - **Beginner**: 1.5x time estimate.
    - **Intermediate**: Standard time.
    - **Expert**: 0.7x time estimate.

## 📁 Source Files

- `src/App.jsx`: Main UI and State.
- `src/components/ConfigurationPanel.jsx`: Sidebar UI.
- `src/components/ScheduleView.jsx`: Calendar/List UI.
- `src/utils/scheduler.js`: Core algorithm for selecting and scheduling problems.
- `scripts/update_db.js`: Data processing script.

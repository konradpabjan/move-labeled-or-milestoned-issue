# actions-move-labeled-issue-repo

Action used to move an issue that was labeled to a specific column

Example YAML workflow. This will move any issue that gets labeled with "priority" to a a specific column in a project

```
on:
  issues:
    types: [labeled]
jobs:
  Move_Labeled_Issue_On_Project_Board:
    runs-on: ubuntu-latest
    steps:
    - uses: konradpabjan/actions-move-labeled-issue-repo@master
      with:
        repo-token: "${{ secrets.GITHUB_TOKEN }}"
        repo-owner: "bbq-beets"
        repo-name: "konradpabjan-test"
        project-id: "3181121"
        column-id: "6443965"
        label-name: "priority"
 ```

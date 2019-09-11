# actions-move-labeled-issue-repo

### Use Case
Everytime a specific label is added to an issue, the associated card in a project should be moved to a specific column. For example, you want any issue that gets labeled with "priority" to automatically move to the column that corresponds to "on deck". If the issue is not on the project board, it will be created in the desired column. If it has already been added, it will be moved to the correct column.

This action is specifically meant for projects that are setup at the repository level with **no association with an organization**. To move a card in a project that is associated with an organization (linked), use the following action: https://github.com/konradpabjan/actions-move-labeled-issue-org

### Input

| Input | Description  |
|---------|---|
|  action-token | An access token that will be used to move or create an issue in a desired column. The standard token that is present for each action will not be sufficient as it does not have sufficient privilages. You must create one that has `repo` permissions  |
| repo-owner  | The owner of the repository  |
| repo-name | The name of the repository  |
| project-id  | The id of the project that we want an issue to be added to or moved. You can get the project id by using the github API: https://developer.github.com/v3/projects/#list-organization-projects or by clicking inspect element in the brower and getting the id by looking at the project. You can get the id by looking for the following property (example with id 3181121, ids will vary): `data-channel="projects:3181121"`  |
| column-id | The id of the column where the issue should be created in or moved to. You can get the column id by using the github API: https://developer.github.com/v3/projects/columns/ or by clicking inspect element in the brower and getting the id by looking at the specific column when in a project. You can get the id by looking for the following property (example with id 6443961, ids will vary): `id="column-6443961"` |
| label-name | The label that should trigger an issue to be moved to a specific column |


### Example YAML

This YAML is meant to be triggered whenever an issue has been labled.

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
        action-token: "${{ secrets.MY_TOKEN }}"
        repo-owner: "bbq-beets"
        repo-name: "konradpabjan-test"
        project-id: "3181121"
        column-id: "6443965"
        label-name: "priority"
 ```

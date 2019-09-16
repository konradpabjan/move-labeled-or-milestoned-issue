const github = require('@actions/github');
const core = require('@actions/core');
const graphql = require('@octokit/graphql');

async function run() {
    const myToken = core.getInput('repo-token');
    const projectUrl = core.getInput('project-url');
    const columnName = core.getInput('column-name');
    const labelName = core.getInput('label-name');
    const isOrgProject = core.getInput('is-org-project');
    const octokit = new github.GitHub(myToken);
    const context = github.context;

    var found = false;
    context.payload.issue.labels.forEach(function(item){
        if(labelName == item.name){
            found = true;
        }
    })

    if(found){
        // get the columnId for the project where the issue should be added/moved
        var columnId = await tryGetColumnId(isOrgProject, columnName, projectUrl);
        if(!columnId){
            throw `Unable to get the column id that corresponds to column:${columnName} in project#${projectNumber}. URL:${projectUrl}`;
        }
        // get the card information, see if the issue is present
        var cardInformation = await getCardInformation(octokit, columnId, context.payload.issue.number);
        var cardId = tryGetCardIdformCardInformation(cardInformation, projectUrl);
        if (cardId){
            // card already exists for the issue
            // move card to the appropriate column
            return await moveExistingCard(octokit, columnId, context.payload.issue.id);
        } else {
            // card is not present
            // create new card in the appropriate column
            return await createNewCard(octokit, columnId, cardId);
        }
    } else {
        // None of the labels match what we are looking for, non-indicative of a failure though
        return `Issue #${context.payload.issue.id} does not have a label that matches ${labelName}, ignoring`;
    }
}

async function createNewCard(octokit, columnId, issueId){
    await octokit.projects.createCard({
        column_id: columnId,
        content_id: issueId,
        content_type: "Issue"
    });
    return `Successfully created a new card in column#${columnId} for an issue with the corresponding id:${issueId}!`;
}

async function moveExistingCard(octokit, columnId, cardId){
    await octokit.projects.moveCard({
        card_id: cardId,
        position: "top",
        column_id: columnId
    })
    return `Succesfully moved card#${cardId} to column#${columnId}`
}

async function getCardInformation(token, projectId, repositoryOwner, repositoryName, issueNumber){
    // GraphQL query to get all of the cards in each column for a project
    // https://developer.github.com/v4/explorer/ is good to play around with 
    const cardInformation = await graphql(
        `query ($ownerVariable: String!, $nameVariable: String!, $numberVariable: Int!){
                    repository(owner:$ownerVariable, name:$nameVariable) { 
                        issue(number:$numberVariable) {
                            title
                            projectCards(first: 100) {
                              nodes {
                                id
                                databaseId
                                project {
                                  url
                                }
                              }
                            }
                        }
                    }        
                }`, {
        ownerVariable: repositoryOwner,
        nameVariable: repositoryName,
        numberVariable: issueNumber,
        headers: {
             authorization: `bearer ${token}`
        }
    });

    return cardInformation;
}

function tryGetCardIdformCardInformation(cardInformation, projectUrl){
    var cardId = null;
    cardInformation.repository.issue.projectCards.nodes.forEach(function(card){
        if (card.nodes){
            card.nodes.forEach(function(node){
                // check if the project url is correct
                if(node.project.url == projectUrl){
                    // a card exists in the project for the issue, get the card id
                    cardId = node.databaseId;
                }
            });
        }
    });
    return cardId;
}

async function tryGetColumnId(isOrgProject, columnName, projectUrl){
    // if org project, we need to extract the org name
    // if repo project, need repo owner and name
    var splitUrl = projectUrl.split("/");
    var projectNumber = parseInt(splitUrl[6], 10);
    if (!Number.isNaN(projectNumber)){
        throw `Unable to get projectNumber for the supplied URL:${projectUrl}. Parsing returned ${projectNumber}`;
    }

    var columnId = null;
    if(isOrgProject){
        // Org url will be in the format: https://github.com/orgs/github/projects/910
        var orgLogin = splitUrl[4];
        console.log(`Org Login:${orgLogin}, project number#${projectNumber}`);
        var orgColumnInfo = await getOrgProjectColumns(orgLogin, projectNumber);
        orgColumnInfo.organization.project.columns.nodes.forEach(function(columnNode){
            var name = columnNode.name;
            if(name == columnName){
                columnId = columnNode.databaseId;
            }
        });
    } else {
        // Repo url will be in the format: https://github.com/bbq-beets/konradpabjan-test/projects/1
        var repoOwner = splitUrl[3];
        var repoName = splitUrl[4];
        console.log(`Repo Owner:${repoOwner}, repo name:${repoName} project number#${projectNumber}`);
        var repoColumnInfo = await getRepoProjectColumns(repoOwner, repoName, projectNumber);
        repoColumnInfo.repository.project.columns.nodes.forEach(function(columnNode){
            var name = columnNode.name;
            if(name == columnName){
                columnId = columnNode.databaseId;
            }
        });
    }
    return columnId;
}

async function getOrgProjectColumns(organizationLogin, projectNumber){
    // GraphQL query to get all of the cards in each column for a project
    // https://developer.github.com/v4/explorer/ is good to play around with
    const response = await graphql(
        `query ($loginVariable: String!, $projectVariable: Int!){
                    organization(login:$loginVariable) {
                        name
                            project(number:$projectVariable) {
                                databaseId
                                name
                                url
                                columns(first:100){
                                    nodes{
                                        databaseId
                                        name
                                    }
                                }
                        }
                    }
                }`, {
        loginVariable: organizationLogin,
        projectVariable: projectNumber,
        headers: {
             authorization: `bearer ${token}`
        }
    });
    return response;
}

async function getRepoProjectColumns(repositoryOwner, repositoryName, projectNumber){
    // GraphQL query to get all of the columns in a project that is setup at that org level
    // https://developer.github.com/v4/explorer/ is good to play around with
    const response = await graphql(
        `query ($ownerVariable: String!, $nameVariable: String!, $projectVariable: Int!){
                    repository(owner:$ownerVariable, name:$nameVariable) {
                        project(number:$projectVariable){
                            id
                            number
                            databaseId
                            name
                            url
                            columns(first:100){
                                nodes{
                                    databaseId
                                    name
                                }
                            }
                        }
                    }        
                }`, {
        ownerVariable: repositoryOwner,
        nameVariable: repositoryName,
        projectVariable: projectNumber,
        headers: {
             authorization: `bearer ${token}`
        }
    });
    return response;
}

run()
    .then(
        (response) => { console.log(`Finished running: ${response}`) },
        (err)  => { console.log(err) }
    )
    .then(
        () => { process.exit() }
     )

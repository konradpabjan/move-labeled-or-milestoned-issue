const github = require('@actions/github');
const core = require('@actions/core');
const graphql = require('@octokit/graphql');

async function run() {
    const myToken = core.getInput('repo-token');
    const repositoryOwner = core.getInput('repo-owner');
    const repositoryName = core.getInput('repo-name');
    const projectId = core.getInput("project-id");
    const columnId = core.getInput('column-id');
    const labelName = core.getInput('label-name');
    const octokit = new github.GitHub(myToken);
    const context = github.context;

    var found = false;
    context.payload.issue.labels.forEach(function(item){
        if(labelName == item.name){
            found = true;
        }
    })

    if(found){
        var isCardCreated = await tryCreateCard(octokit, columnId, context.payload.issue.id);   
        if (isCardCreated == 0){
            // A card already exists, we must find the cardId and move it to the correct column
            var cardId = await findCardId(myToken, projectId, repositoryOwner, repositoryName, context.payload.issue.id);
            if(cardId){
                moveCard(octokit, cardId, columnId);
                return `Sucesfully moved card #${cardId} to column #${columnId}`;
            } else {
                // unable to find the card?
                return `#ERROR# Unable to find a card with an id of #${context.payload.issue.id}, not doing anything`;
            }
        } else {
            // A card was created in the column that we want it to end up in
            return `A card was created in column #${columnId} for issue #${context.payload.issue.id} or already exists in the column`;
        }
    } else {
        // None of the labels match what we are looking for
        return `Issue #${context.payload.issue.id} does not have a label that matches ${labelName}, ignoring`;
    }
}

async function tryCreateCard(octokit, columnId, issueId){
    try {
        await octokit.projects.createCard({
            column_id: columnId,
            content_id: issueId,
            content_type: "Issue"
        });
        return 1;
    } catch (error) {
        // the card already exists in the project
        return 0;
    }
}

async function moveCard(octokit, cardId, columnId){
    await octokit.projects.moveCard({
        card_id: cardId,
        position: "top",
        column_id: columnId
    })
}

async function findCardId(token, projectId, repositoryOwner, repositoryName, issueId){
    // GraphQL query to get all of the cards in each column for a project
    // https://developer.github.com/v4/explorer/ is good to play around with 
    const response  = await graphql({
        query: `{
                    repository(owner:"${repositoryOwner}", name:"${repositoryName}") { 
                        projects(first: 100) {
                            nodes {
                                databaseId
                                columns(first: 100) {
                                        edges {
                                            node {
                                                databaseId
                                                name
                                                cards {
                                                    edges {
                                                        node {
                                                        databaseId
                                                        content {
                                                            ... on Issue {
                                                            databaseId
                                                            number
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }        
                }`,
        owner: `${repositoryOwner}`,
        name: `${repositoryName}`,
        headers: {
             authorization: `bearer ${token}`
        }
    });

    var cardId = null;
    response.repository.projects.nodes.forEach(function(project){
        // project level
        // make sure the projectId is correct, the same issue can be in multiple projects
        if (project.databaseId == projectId){
            project.columns.edges.forEach(function(column){
                // column level
                column.node.cards.edges.forEach(function(card){
                    // card level
                    // check if the issue databaseId matches the databaseId of the card content
                    if (card.node.content != null){
                        // only issues and pull requests have content
                        if (card.node.content.databaseId == issueId){
                            cardId = card.node.databaseId;
                        }
                    }
                });
            });
        }
    })
    return cardId;
}

run()
    .then(
        (response) => { console.log(`Finished running: ${response}`) },
        (err)  => { console.log(err) }
    )
    .then(
        () => { process.exit() }
     )
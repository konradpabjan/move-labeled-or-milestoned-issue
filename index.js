const github = require('@actions/github');
const core = require('@actions/core');
const graphql = require('@octokit/graphql');

async function run() {
    const myToken = core.getInput('repo-token');
    const projectId = core.getInput('project-id');
    const columnId = core.getInput('column-id');
    const labelName = core.getInput('label-name');
    const context = github.context;

    console.log(context.payload.issue.labels);

    var found = false;
    context.payload.issue.labels.forEach(function(item){
        console.log(item.name)
        if(labelName == item.name){
            // the label matches
            console.log("the label matches: " + labelName)
            found = true;
        }
    })

    if(found){
        try{
            // This might fail since the card is already created?
            /*
            await octokit.projects.createCard({
                column_id: columnId,
                content_id: context.payload.issue.id,
                content_type: "Issue"
            });cls
            */

            // for now assume that a card already exists for the issues
            // query for all of the cards in the project and get the card id of the issue

            console.log("we are going to be looking for the card with ID#:  " +context.payload.issue.id);

           console.log("runing graphQL query to find all of the cards in a project");
           const response  = await graphql(
               `
               {
                repository(owner: "bbq-beets", name: "konradpabjan-test") {
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
              }
               `,
               {
                 headers: {
                   Authorization: `bearer ${myToken}`
                 }
               }
             );

            console.log(response);

            var cardId = null;

            response.repository.projects.nodes.forEach(function(project){
                // we are at the project level
                console.log(project.columns)
                project.columns.edges.forEach(function(column){
                    // column level
                    console.log(column);
                    column.node.cards.edges.forEach(function(card){
                        // card level
                        console.log(card);

                        // check if the issue databaseId matches the databaseId of the card content
                        if (card.node.content != null){
                            // only issues and pull requests have content
                            if (card.node.content.databaseId == context.payload.issue.id){
                                console.log("We have a match!!");
                                cardId = card.node.databaseId;
                            }
                        }
                    });
                });
            })

            console.log("Done searching for the card id");
            console.log("card id is: " + cardId);

            // gonna try to move the card to the super important column
            await octokit.projects.moveCard({
                card_id: cardId,
                column_id: 6443965
            })

            /*
            console.log("runing graphQL query #2");
            const response2  = await graphql(
                `
                  {
                    repository(owner:"konradpabjan", name:"Testing2") {
                        issues(states:CLOSED) {
                          totalCount
                        }
                      }
                  }
                `,
                {
                  headers: {
                    Authorization: `bearer ${myToken}`
                  }
                }
              );
              */

            //console.log(response2);
            
        } catch (error) {
            console.log(error)
            /*
            // fetch all of the columns for the project
            var columnInformation = await octokit.projects.listColumns({
                project_id: 3181121
            });
            console.log(columnInformation)
            // we're going to have to get all the columns in 
            columnInformation.data.forEach(function )
            */
        }
    }

    return "Initial Testing";
}

run()
    .then(
        (testing) => { console.log(`Testing # ${testing}`) },
        (err)  => { console.log(err) }
    )
    .then(
        () => { process.exit() }
     )
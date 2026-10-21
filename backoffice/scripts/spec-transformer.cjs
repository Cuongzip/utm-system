module.exports = (spec) => {
    if (spec.paths) {
        for (const pathItem of Object.values(spec.paths)) {
            for (const operation of Object.values(pathItem)) {
                if (operation && typeof operation === "object" && operation.responses) {
                    for (const response of Object.values(operation.responses)) {
                        if (
                            response &&
                            response.content &&
                            response.content["*/*"] &&
                            !response.content["application/json"]
                        ) {
                            response.content["application/json"] = response.content["*/*"];
                        }
                    }
                }
                if (
                    operation &&
                    typeof operation === "object" &&
                    operation.requestBody &&
                    operation.requestBody.content &&
                    operation.requestBody.content["*/*"] &&
                    !operation.requestBody.content["application/json"]
                ) {
                    operation.requestBody.content["application/json"] =
                        operation.requestBody.content["*/*"];
                }
            }
        }
    }
    return spec;
};

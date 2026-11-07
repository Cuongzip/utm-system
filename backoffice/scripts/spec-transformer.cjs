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
    if (spec.components && spec.components.schemas) {
        for (const schema of Object.values(spec.components.schemas)) {
            if (schema && typeof schema === "object" && schema.properties) {
                const requiredSet = new Set(Array.isArray(schema.required) ? schema.required : []);
                for (const [propName, prop] of Object.entries(schema.properties)) {
                    if (prop && typeof prop === "object") {
                        if (
                            requiredSet.has(propName) &&
                            prop.type === "string" &&
                            !prop.enum &&
                            (!prop.minLength || prop.minLength === 0)
                        ) {
                            prop.minLength = 1;
                        }
                        if (
                            propName === "name" &&
                            prop.type === "string" &&
                            !prop.enum &&
                            (!prop.minLength || prop.minLength === 0)
                        ) {
                            prop.minLength = 1;
                        }
                        if (
                            (propName === "code" || propName === "registrationNumber") &&
                            prop.type === "string" &&
                            (!prop.minLength || prop.minLength === 0)
                        ) {
                            prop.minLength = 3;
                            if (!prop.maxLength) {
                                prop.maxLength = 50;
                            }
                            if (!prop.pattern) {
                                prop.pattern = "^[A-Za-z0-9_-]+$";
                            }
                        }
                    }
                }
            }
        }
    }

    return spec;
};

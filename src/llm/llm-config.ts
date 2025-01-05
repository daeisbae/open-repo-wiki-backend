/**
 * Configuration class for LLM generation parameters
 * @class LLMConfig
 * @property {number} temperature - Controls randomness in the output (0.0 to 2.0)
 * @property {number} topP - Controls diversity via nucleus sampling (0.0 to 1.0)
 * @property {number} topK - Controls diversity by limiting to K most likely tokens
 * @property {number} maxToken - Controls the max number of output token
 */

export default class LLMConfig {
    private _temperature: number;
    private _topP: number;
    private _topK: number;
    private _maxToken: number;

    /**
     * Creates an instance of LLMConfig
     * @param {number} temperature
     * @param {number} topP
     * @param {number} topK
     * @param {number} maxToken
     */
    constructor(
        temperature: number,
        topP: number,
        topK: number,
        maxToken: number
    ) {
        if (temperature > 2 || temperature < 0) throw new Error('Temperature must be between 0.0 and 2.0');
        if (topP > 1 || topP < 0) throw new Error('Top-p must be between 0.0 and 1.0');
        this._temperature = temperature;
        this._topP = topP;
        this._topK = topK;
        this._maxToken = maxToken;
    }

    /**
     * Gets the temperature parameter
     * @returns {number} The temperature value (0.0 to 1.0)
     */
    get temperature(): number {
        return this._temperature;
    }

    /**
     * Gets the top-p parameter
     * @returns {number} The top-p value (0.0 to 1.0)
     */
    get topP(): number {
        return this._topP;
    }

    /**
     * Gets the top-k parameter
     * @returns {number} The top-k value
     */
    get topK(): number {
        return this._topK;
    }

    /**
     * Gets the max output token parameter
     * @returns {number} The number of tokens
     */
    get maxToken(): number {
        return this._maxToken;
    }
}
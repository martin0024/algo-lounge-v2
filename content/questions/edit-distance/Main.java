import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

public class Main {
    public static void main(String[] args) throws Exception {
        JsonArray in = JsonParser.parseString(args[0]).getAsJsonArray();
        String word1 = in.get(0).getAsString();
        String word2 = in.get(1).getAsString();

        int result = new Solution().minDistance(word1, word2);
        System.out.println(new Gson().toJson(result));
    }
}

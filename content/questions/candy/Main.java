import com.google.gson.Gson;
import com.google.gson.JsonArray;
import com.google.gson.JsonParser;

public class Main {
    public static void main(String[] args) throws Exception {
        JsonArray in = JsonParser.parseString(args[0]).getAsJsonArray();
        JsonArray jr = in.get(0).getAsJsonArray();
        int[] ratings = new int[jr.size()];
        for (int i = 0; i < jr.size(); i++) ratings[i] = jr.get(i).getAsInt();

        int result = new Solution().candy(ratings);
        System.out.println(new Gson().toJson(result));
    }
}
